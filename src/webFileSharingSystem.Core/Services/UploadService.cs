﻿using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Options;
using webFileSharingSystem.Core.Specifications;
using webFileSharingSystem.Core.Storage;
using File = webFileSharingSystem.Core.Entities.File;

namespace webFileSharingSystem.Core.Services
{
    public class UploadService : IUploadService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IFilePersistenceService _filePersistenceService;

        private readonly IOptions<StorageSettings> _storageSettings;

        private static readonly
            ConcurrentDictionary<(int userId, int fileId), PartialFileInfoCache> UserFileCache = new();


        public UploadService(IUnitOfWork unitOfWork, IFilePersistenceService filePersistenceService,
            IOptions<StorageSettings> storageSettings)
        {
            _unitOfWork = unitOfWork;
            _filePersistenceService = filePersistenceService;
            _storageSettings = storageSettings;
        }


        public async Task<(Result result, PartialFileInfo? partialFileInfo)> CreateNewFileAsync(int userId,
            int? parentId,
            string fileName,
            string? mimeType, long size)
        {
            var appUser = await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(userId);
            if (appUser is null)
                return (Result.Failure($"User not found, userId: {userId}"), null);

            if (appUser.UsedSpace + (ulong) size > appUser.Quota)
                return (Result.Failure($"You do not have enough free space to upload \"{fileName}\""), null);

            var preferredChunk = CalculatePreferredChunkSize(size);
            PartialFileInfo? partialFileInfo = null;
            if (size != 0)
            {
                partialFileInfo = preferredChunk is null
                    ? StorageExtensions.GeneratePartialFileInfo(size)
                    : StorageExtensions.GeneratePartialFileInfo(size, preferredChunk.Value);
            }

            var fileGuidId = Guid.NewGuid();
            //TODO Check if file with the same name already exists for that user
            var file = new File
            {
                UserId = userId,
                FileName = fileName,
                MimeType = mimeType,
                Size = (ulong) size,
                FileStatus = size > 0 ? FileStatus.Incomplete : FileStatus.Completed,
                FileId = fileGuidId,
                ParentId = parentId,
                PartialFileInfo = partialFileInfo
            };

            _unitOfWork.Repository<File>().Add(file);

            if (parentId is not null && size > 0)
            {
                var filesToUpdateSize =
                    await _unitOfWork.CustomQueriesRepository().GetListOfAllParentsAsFiles(parentId.Value);

                foreach (File fileToUpdate in filesToUpdateSize)
                {
                    fileToUpdate.Size += file.Size;
                    _unitOfWork.Repository<File>().Update(fileToUpdate);
                }
            }

            appUser.UsedSpace += file.Size;
            _unitOfWork.Repository<ApplicationUser>().Update(appUser);

            if (await _unitOfWork.Complete() <= 0)
                return (Result.Failure("Problem during upload initialization"), null);

            try
            {
                var filePath = await _filePersistenceService.GenerateNewFile(userId, fileGuidId);
                //TODO What if given key already exists in the cache? 
                if (partialFileInfo is not null)
                    UserFileCache[(userId, file.Id)] = new PartialFileInfoCache(filePath, partialFileInfo);
                return (Result.Success(), partialFileInfo);
            }
            catch
            {
                _filePersistenceService.DeleteExistingFile(userId, fileGuidId);
                return (Result.Failure("Problem during upload initialization"), null);
            }
        }

        public Result UploadFileChunk(int userId, int fileId, int chunkIndex, Stream chunkStream,
            CancellationToken cancellationToken = default)
        {
            var key = (userId, fileId);

            if (!UserFileCache.ContainsKey(key))
            {
                var lockObject = new object();

                File? file = null;

                lock (lockObject)
                {
                    if (!UserFileCache.ContainsKey(key))
                    {
                        file = _unitOfWork.Repository<File>()
                            .FindAsync(new FindFileByIdIncludePartialFileInfo(fileId), cancellationToken)
                            .ConfigureAwait(false).GetAwaiter().GetResult()
                            .SingleOrDefault();

                        if (file?.PartialFileInfo is not null)
                            UserFileCache[key] = new PartialFileInfoCache(
                                _filePersistenceService.GetFilePath(userId, file.FileId!.Value),
                                file.PartialFileInfo);
                    }
                }

                if (file is null || file.UserId != userId)
                    return Result.Failure("File does not exist or you do not have access");

                if (file.IsDirectory) return Result.Failure("Directory can't be uploaded");

                if (file.FileStatus == FileStatus.Completed) return Result.Failure("File is already fully uploaded");

                if (file.IsDeleted) return Result.Failure("Can't upload to deleted file");

                if (file.PartialFileInfo is null) return Result.Failure("File does not contain 'PartialFileInfo'");
            }


            var partialFileInfoCache = UserFileCache[key];

            lock (partialFileInfoCache.PartialFileInfo)
            {
                partialFileInfoCache.PartialFileInfo.PersistenceMap.SetBit(chunkIndex, false);

                _filePersistenceService.SaveChunk(partialFileInfoCache.FilePath, chunkIndex,
                        partialFileInfoCache.PartialFileInfo.ChunkSize, chunkStream,
                        cancellationToken)
                    .ConfigureAwait(false).GetAwaiter().GetResult();

                partialFileInfoCache.IsDirty = true;
            }

            return Result.Success();
        }


        public async Task<Result> CompleteFileAsync(int userId, int fileId,
            CancellationToken cancellationToken = default)
        {
            File? file = null;

            var key = (userId, fileId);

            if (!UserFileCache.ContainsKey(key))
            {
                var lockObject = new object();

                lock (lockObject)
                {
                    if (!UserFileCache.ContainsKey(key))
                    {
                        file = _unitOfWork.Repository<File>()
                            .FindAsync(new FindFileByIdIncludePartialFileInfo(fileId), cancellationToken)
                            .ConfigureAwait(false).GetAwaiter().GetResult()
                            .SingleOrDefault();

                        if (file?.PartialFileInfo is not null)
                            UserFileCache[key] = new PartialFileInfoCache(
                                _filePersistenceService.GetFilePath(userId, file.FileId!.Value),
                                file.PartialFileInfo);
                    }
                }

                if (file is null || file.UserId != userId)
                    return Result.Failure("File does not exist or you do not have access");

                if (file.IsDirectory) return Result.Failure("Directory can't be completed");

                if (file.IsDeleted) return Result.Failure("Deleted files can't be completed");

                if (file.PartialFileInfo is null) return Result.Failure("File does not contain 'PartialFileInfo'");
            }


            if (!UserFileCache[key].PartialFileInfo.PersistenceMap.CheckIfAllBitsAreZeros())
                return Result.Failure("Not all chunks were uploaded correctly to the server");

            file ??= await _unitOfWork.Repository<File>().FindByIdAsync(fileId, cancellationToken);

            if (file is null) return Result.Failure("File does not exist");

            file.FileStatus = FileStatus.Completed;

            _unitOfWork.Repository<File>().Update(file);

            _unitOfWork.Repository<PartialFileInfo>().Remove(UserFileCache[key].PartialFileInfo);

            await _unitOfWork.Complete(cancellationToken);

            return Result.Success();
        }


        public async Task<(Result result, IEnumerable<int> missingChunkIndexes)> GetMissingFileChunks(int userId,
            int fileId,
            CancellationToken cancellationToken = default)
        {
            File? file = null;

            var key = (userId, fileId);

            if (!UserFileCache.ContainsKey(key))
            {
                var lockObject = new object();

                lock (lockObject)
                {
                    if (!UserFileCache.ContainsKey(key))
                    {
                        file = _unitOfWork.Repository<File>()
                            .FindAsync(new FindFileByIdIncludePartialFileInfo(fileId), cancellationToken)
                            .ConfigureAwait(false).GetAwaiter().GetResult()
                            .SingleOrDefault();

                        if (file?.PartialFileInfo is not null)
                            UserFileCache[key] = new PartialFileInfoCache(
                                _filePersistenceService.GetFilePath(userId, file.FileId!.Value),
                                file.PartialFileInfo);
                    }
                }

                if (file is null || file.UserId != userId)
                    return (Result.Failure("File does not exist or you do not have access"), Array.Empty<int>());

                if (file.IsDirectory)
                    return (Result.Failure("Directory can't have missing chunks"), Array.Empty<int>());

                if (file.IsDeleted)
                    return (Result.Failure("Deleted files can't have missing chunks"), Array.Empty<int>());

                if (file.FileStatus == FileStatus.Completed)
                    return (Result.Failure("Completed file can't have missing chunks"), Array.Empty<int>());

                if (file.PartialFileInfo is null)
                    return (Result.Failure("File does not contain 'PartialFileInfo'"), Array.Empty<int>());
            }

            var partialFileInfo = UserFileCache[key].PartialFileInfo;

            var uploadedChunks =
                partialFileInfo.PersistenceMap.GetAllIndexesWithValue(true,
                    maxIndex: partialFileInfo.NumberOfChunks - 1);

            return (Result.Success(), uploadedChunks);
        }

        public async Task<Result> UpdatePartialFileInfoAsync(int userId, int fileId)
        {
            var key = (userId, fileId);

            if (!UserFileCache.ContainsKey(key)) return Result.Failure("'PartialFileInfo' can not be found");

            var partialFileInfo = UserFileCache[key].PartialFileInfo;

            _unitOfWork.Repository<PartialFileInfo>().Update(partialFileInfo);

            await _unitOfWork.Complete();

            return Result.Success();
        }

        public PartialFileInfo? GetCachedPartialFileInfo(int userId, int fileId) =>
            UserFileCache.GetValueOrDefault((userId, fileId))?.PartialFileInfo;

        public async Task<(Result result, File? file)> EnsureDirectoriesExist(int userId, int? parentId,
            IEnumerable<string> folders,
            CancellationToken cancellationToken = default)
        {
            var createDirectories = false;
            File? directoryFile = null;

            foreach (var folder in folders)
            {
                if (!createDirectories)
                {
                    directoryFile = (await _unitOfWork.Repository<File>()
                            .FindAsync(new GetFileByNameSpecs(userId, parentId, folder), cancellationToken))
                        .SingleOrDefault();

                    if (directoryFile is null)
                        createDirectories = true;

                    else if (!directoryFile.IsDirectory)
                        return (Result.Failure($"File with the name \"{folder}\" already exists"), null);


                    parentId = directoryFile?.Id ?? parentId;
                }


                if (!createDirectories)
                    continue;

                directoryFile = new File
                {
                    FileName = folder,
                    IsDirectory = true,
                    ParentId = parentId,
                    UserId = userId
                };

                _unitOfWork.Repository<File>().Add(directoryFile);
                if (await _unitOfWork.Complete(cancellationToken) <= 0)
                    return (Result.Failure("Problem with creating directories"), null);
                parentId = directoryFile.Id;
            }

            return (Result.Success(), directoryFile);
        }

        private int? CalculatePreferredChunkSize(long fileSize)
        {
            if (_storageSettings.Value?.ChunkSizeConstraints is null)
                return null;

            var chunkSizeConstraints = _storageSettings.Value.ChunkSizeConstraints;
            var calculatedChunkSize =
                (long) Math.Ceiling((double) fileSize / chunkSizeConstraints.PreferredNumberOfChunks);

            if (calculatedChunkSize < chunkSizeConstraints.MinimumChunkSize)
                return chunkSizeConstraints.MinimumChunkSize;

            if (calculatedChunkSize > chunkSizeConstraints.MaximumChunkSize)
                return chunkSizeConstraints.MaximumChunkSize;

            return (int) calculatedChunkSize;
        }

        public static async Task SaveCacheData(IRepository<PartialFileInfo> partialFileInfoRepository,
            IApplicationDbContext applicationDbContext, CancellationToken cancellationToken)
        {
            foreach (var cache in UserFileCache.Values.Where(t => t.IsDirty))
            {
                lock (cache.PartialFileInfo)
                {
                    partialFileInfoRepository.Update(cache.PartialFileInfo);
                    cache.IsDirty = false;
                }
            }

            await applicationDbContext.SaveChangesAsync(cancellationToken);
        }

        private class PartialFileInfoCache
        {
            public PartialFileInfoCache(string filePath, PartialFileInfo partialFileInfo)
            {
                FilePath = filePath;
                PartialFileInfo = partialFileInfo;
            }

            public bool IsDirty { get; set; }
            public string FilePath { get; set; }
            public PartialFileInfo PartialFileInfo { get; set; }
        }
    }
}