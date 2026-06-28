using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Options;
using File = webFileSharingSystem.Core.Entities.File;

namespace webFileSharingSystem.Core.Services
{
    public class DownloadService : IDownloadService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IGuardService _guardService;
        private readonly IFilePersistenceService _filePersistenceService;
        private readonly byte[] _key;

        public DownloadService(IUnitOfWork unitOfWork,
            IGuardService guardService,
            IFilePersistenceService filePersistenceService,
            IOptions<DownloadTokenOptions> options)
        {
            _unitOfWork = unitOfWork;
            _guardService = guardService;
            _filePersistenceService = filePersistenceService;
            if (options?.Value?.Key is null || options.Value.Key.Length == 0)
                throw new ArgumentException("DownloadTokenOptions:Key must be configured");
            _key = Convert.FromBase64String(options.Value.Key);
            if (_key.Length != 16 && _key.Length != 24 && _key.Length != 32)
                throw new ArgumentException("Download token key must be 128/192/256-bit (base64)");
        }

        public async Task<(Result<OperationResult> Result, DownloadActionType Action, string Token)> PrepareDownloadAsync(
            int[] fileIds, int userId, CancellationToken cancellationToken = default)
        {
            const string errorMessage = "Files or directories does not exist or you do not have access";
            if (fileIds.Length == 0)
                return (Result.Failure(OperationResult.BadRequest, "No file IDs provided"), default, string.Empty);

            DownloadActionType action;
            if (fileIds.Length == 1)
            {
                var file = await _unitOfWork.Repository<File>().FindByIdAsync(fileIds[0], cancellationToken);
                if (file is null)
                    return (Result.Failure(OperationResult.BadRequest, "File not found"), default, string.Empty);
                if (!await _guardService.UserCanPerform(userId, file, ShareAccessMode.ReadOnly, cancellationToken))
                    return (Result.Failure(OperationResult.Unauthorized, errorMessage), default, string.Empty);
                action = file.IsDirectory ? DownloadActionType.Archive : DownloadActionType.File;
            }
            else
            {
                var filesToDownload = (await _unitOfWork.CustomQueriesRepository()
                        .GetListOfAllFilesFromLocations(fileIds, cancellationToken))
                    .ToDictionary(k => k.Id);

                if (fileIds.Except(filesToDownload.Keys).Any())
                    return (Result.Failure(OperationResult.Unauthorized, errorMessage), default, string.Empty);

                foreach (var (_, fileToDownload) in filesToDownload.Where(f => fileIds.Contains(f.Key)))
                {
                    if (!await _guardService.UserCanPerform(userId, fileToDownload, ShareAccessMode.ReadOnly, cancellationToken))
                        return (Result.Failure(OperationResult.Unauthorized, errorMessage), default, string.Empty);
                }

                action = DownloadActionType.Archive;
            }

            var token = CreateToken(fileIds);
            return (Result.Success<OperationResult>(), action, token);
        }

        public async Task<(Result<OperationResult> Result, DownloadedFile? File)> GetSingleFileAsync(
            string token, int userId, CancellationToken cancellationToken = default)
        {
            const string errorMessage = "File does not exist or you do not have access";

            int[] fileIds;
            try
            {
                fileIds = ReadToken(token);
            }
            catch
            {
                return (Result.Failure(OperationResult.BadRequest, errorMessage), null);
            }
            var fileId = fileIds.FirstOrDefault();
            var fileToDownload = await _unitOfWork.Repository<File>().FindByIdAsync(fileId, cancellationToken);
            if (fileToDownload is null)
                return (Result.Failure(OperationResult.BadRequest, errorMessage), null);

            if (!await _guardService.UserCanPerform(userId, fileToDownload, ShareAccessMode.ReadOnly, cancellationToken))
                return (Result.Failure(OperationResult.Unauthorized, errorMessage), null);

            if (fileToDownload.IsDirectory)
                return (Result.Failure(OperationResult.BadRequest, "Directory can't be downloaded"), null);

            var stream = await _filePersistenceService.GetFileStream(userId, fileToDownload.FileGuid!.Value, cancellationToken);
            var contentType = string.IsNullOrEmpty(fileToDownload.MimeType) ? "application/octet-stream" : fileToDownload.MimeType;

            return (Result.Success<OperationResult>(), new DownloadedFile(stream, fileToDownload.FileName, contentType));
        }

        public async Task<Result<OperationResult>> WriteArchiveToAsync(
            string token, int userId, Stream output, CancellationToken cancellationToken = default)
        {
            const string errorMessage = "Files or directories does not exist or you do not have access";

            int[] fileIds;
            try
            {
                fileIds = ReadToken(token);
            }
            catch
            {
                return Result.Failure(OperationResult.BadRequest, errorMessage);
            }

            var filesToDownload = (await _unitOfWork.CustomQueriesRepository()
                .GetListOfAllFilesFromLocations(fileIds, cancellationToken))
                .ToDictionary(k => k.Id);

            if (fileIds.Except(filesToDownload.Keys).Any())
                return Result.Failure(OperationResult.BadRequest, errorMessage);

            foreach (var (_, fileToDownload) in filesToDownload.Where(f => fileIds.Contains(f.Key)))
            {
                if (!await _guardService.UserCanPerform(userId, fileToDownload, ShareAccessMode.ReadOnly, cancellationToken))
                    return Result.Failure(OperationResult.Unauthorized, errorMessage);
            }

            using var archive = new ZipArchive(output, ZipArchiveMode.Create, leaveOpen: true);
            foreach (var file in filesToDownload.Values.Where(f => !f.IsDirectory))
            {
                var computedFilePath = string.Join("/",
                    FindRelativeFilePath(file, filesToDownload).Reverse().Select(f => f.FileName));
                var entry = archive.CreateEntry(computedFilePath, CompressionLevel.NoCompression);
                await using var entryStream = entry.Open();
                try
                {
                    await using var fileStream = await _filePersistenceService.GetFileStream(userId, file.FileGuid!.Value, cancellationToken);
                    await fileStream.CopyToAsync(entryStream, cancellationToken);
                }
                catch (Exception)
                {
                    return Result.Failure(OperationResult.BadRequest, "One of the files cannot be retrieved.");
                }
            }

            return Result.Success<OperationResult>();
        }

        private static IEnumerable<File> FindRelativeFilePath(File startFile, IDictionary<int, File> fileDictionary)
        {
            var currentFile = startFile;
            var visited = new HashSet<int>();
            while (visited.Add(currentFile.Id))
            {
                yield return currentFile;
                if (currentFile.ParentId is null || !fileDictionary.TryGetValue(currentFile.ParentId.Value, out currentFile))
                {
                    yield break;
                }
            }

            throw new Exception("loop detected");
        }

        private string CreateToken(int[] fileIds)
        {
            var json = JsonSerializer.Serialize(fileIds);
            var plaintext = Encoding.UTF8.GetBytes(json);

            using var aes = new AesGcm(_key, 16);

            var nonce = RandomNumberGenerator.GetBytes(12);
            var ciphertext = new byte[plaintext.Length];
            var tag = new byte[16];

            aes.Encrypt(nonce, plaintext, ciphertext, tag);

            var combined = new byte[nonce.Length + ciphertext.Length + tag.Length];
            Buffer.BlockCopy(nonce, 0, combined, 0, nonce.Length);
            Buffer.BlockCopy(ciphertext, 0, combined, nonce.Length, ciphertext.Length);
            Buffer.BlockCopy(tag, 0, combined, nonce.Length + ciphertext.Length, tag.Length);
            
            return ToBase64Url(combined);
        }

        private int[] ReadToken(string token)
        {
            var combined = FromBase64Url(token);

            var nonce = combined[..12];
            var tag = combined[^16..];
            var ciphertext = combined[12..^16];

            using var aes = new AesGcm(_key, 16);
            var plaintext = new byte[ciphertext.Length];
            aes.Decrypt(nonce, ciphertext, tag, plaintext);

            return JsonSerializer.Deserialize<int[]>(plaintext)!;
        }
        
        private static string ToBase64Url(byte[] bytes)
        {
            return Convert.ToBase64String(bytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .Replace("=", "");
        }
        
        private static byte[] FromBase64Url(string base64Url)
        {
            string padded = base64Url
                .Replace("-", "+")
                .Replace("_", "/");

            // Add padding back
            switch (padded.Length % 4)
            {
                case 2: padded += "=="; break;
                case 3: padded += "="; break;
            }

            return Convert.FromBase64String(padded);
        }
    }
}
