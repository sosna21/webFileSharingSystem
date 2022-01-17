using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Options;
using static System.IO.File;
using File = webFileSharingSystem.Core.Entities.File;

namespace webFileSharingSystem.Infrastructure.Storage.OnPremise
{
    public class FilePersistenceService : IFilePersistenceService
    {
        private readonly IOptions<StorageSettings> _settings;

        public FilePersistenceService(IOptions<StorageSettings> settings)
        {
            _settings = settings;
        }

        public async Task SaveChunk(string filePath, int chunkIndex, int chunkSize, byte[] data,
            CancellationToken cancellationToken = default)
        {
            await SaveChunkInternal(filePath, chunkIndex, chunkSize,
                async stream => await stream.WriteAsync(data, cancellationToken));
        }

        public async Task SaveChunk(string filePath, int chunkIndex, int chunkSize, Stream data,
            CancellationToken cancellationToken = default)
        {
            await SaveChunkInternal(filePath, chunkIndex, chunkSize,
                stream => data.CopyToAsync(stream, cancellationToken));
        }

        private static async Task SaveChunkInternal(string filePath, int chunkIndex, int chunkSize,
            Func<Stream, Task> persistToStreamAction)
        {
            await using var stream = new FileStream(filePath, FileMode.OpenOrCreate, FileAccess.Write,
                FileShare.Write,
                4096, FileOptions.Asynchronous);

            stream.Position = (long) chunkIndex * chunkSize;

            await persistToStreamAction(stream);
        }

        public FileStream GetFileStream(string filePath)
        {
            return new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read,
                4096, FileOptions.Asynchronous);
        }

        public async Task<byte[]> GetChunk(string filePath, int chunkSize, int chunkIndex,
            CancellationToken cancellationToken = default)
        {
            await using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read,
                4096, FileOptions.Asynchronous);

            stream.Position = chunkIndex * chunkSize;

            if (stream.Position + chunkSize > stream.Length)
            {
                chunkSize = (int) (stream.Length - stream.Position);
            }

            var buffer = new byte[chunkSize];
            await stream.ReadAsync(buffer, cancellationToken);

            return buffer;
        }

        public async Task<string> GenerateNewFile(int userId, Guid persistedFileId)
        {
            var filePath = Path.Combine(_settings.Value.OnPremiseFileLocation);
            Directory.CreateDirectory(filePath);

            filePath = Path.Combine(filePath, persistedFileId.ToString());

            await Create(filePath).DisposeAsync();

            return filePath;
        }

        public string GetFilePath(int userId, Guid fileGuid)
        {
            return Path.Combine(_settings.Value.OnPremiseFileLocation, fileGuid.ToString());
        }

        public void DeleteExistingFile(int userId, Guid persistedFileId)
        {
            var filePath = Path.Combine(_settings.Value.OnPremiseFileLocation);
            if (!Directory.Exists(filePath)) return;
            filePath = Path.Combine(filePath, persistedFileId.ToString());
            Delete(filePath);
        }

        public IEnumerable<File> FindRelativeFilePath(File startFile, IDictionary<int, File> fileDictionary)
        {
            var currentFile = startFile;
            var visited = new HashSet<int>();
            while (visited.Add(currentFile.Id))
            {
                yield return currentFile;
                if (currentFile.ParentId is null)
                {
                    yield break;
                }

                if (!fileDictionary.TryGetValue(currentFile.ParentId.Value, out currentFile))
                {
                    throw new Exception("invalid parent id");
                }
            }

            throw new Exception("loop detected");
        }
    }
}