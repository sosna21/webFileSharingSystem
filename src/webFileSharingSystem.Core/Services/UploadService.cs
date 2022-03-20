using System;
using System.Collections;
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

        private static readonly PartialFileInfoCacheDictionary UserFileCache = new();

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
                FileGuid = fileGuidId,
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
                await _filePersistenceService.GenerateNewFile(userId, fileGuidId);
                //TODO What if given key already exists in the cache? 
                if (partialFileInfo is not null)
                    UserFileCache[(userId, file.Id)] = new PartialFileInfoCache(userId, fileGuidId, partialFileInfo);
                return (Result.Success(), partialFileInfo);
            }
            catch
            {
                await _filePersistenceService.DeleteExistingFile(userId, fileGuidId);
                return (Result.Failure("Problem during upload initialization"), null);
            }
        }

        public async Task<Result> UploadFileChunk(int userId, int fileId, int chunkIndex, Stream chunkStream,
            CancellationToken cancellationToken = default)
        {
            if (!UserFileCache.TryGetValue((userId, fileId), out var partialFileInfoCache))
            {
                File? file;
                (partialFileInfoCache, file) = await GetFileAndPartialFileInfoCacheThreadSafeAsync(userId, fileId, cancellationToken);

                if (file is null || file.UserId != userId)
                    return Result.Failure("File does not exist or you do not have access");

                if (file.IsDirectory) return Result.Failure("Directory can't be uploaded");

                if (file.FileStatus == FileStatus.Completed) return Result.Failure("File is already fully uploaded");

                if (file.PartialFileInfo is null) return Result.Failure("File does not contain 'PartialFileInfo'");
            }

            await _filePersistenceService.SaveChunk(
                partialFileInfoCache!.UserId,
                partialFileInfoCache.FileGuid,
                chunkIndex,
                partialFileInfoCache.PartialFileInfo.ChunkSize,
                chunkStream,
                cancellationToken);

            lock (partialFileInfoCache.PartialFileInfo)
            {
                partialFileInfoCache.PartialFileInfo.PersistenceMap.SetBit(chunkIndex, false);
                partialFileInfoCache.IsDirty = true;
            }

            return Result.Success();
        }

        public async Task<Result> CompleteFileAsync(int userId, int fileId,
            CancellationToken cancellationToken = default)
        {
            File? file = null;
            if (!UserFileCache.TryGetValue((userId, fileId), out var partialFileInfoCache))
            {
                (partialFileInfoCache, file) = await GetFileAndPartialFileInfoCacheThreadSafeAsync(userId, fileId, cancellationToken);

                if (file is null || file.UserId != userId)
                    return Result.Failure("File does not exist or you do not have access");

                if (file.IsDirectory) return Result.Failure("Directory can't be completed");

                if (file.PartialFileInfo is null) return Result.Failure("File does not contain 'PartialFileInfo'");
            }

            if (!partialFileInfoCache!.PartialFileInfo.PersistenceMap.CheckIfAllBitsAreZeros())
                return Result.Failure("Not all chunks were uploaded correctly to the server");

            file ??= await _unitOfWork.Repository<File>().FindByIdAsync(fileId, cancellationToken);

            if (file is null) return Result.Failure("File does not exist");
            
            var allChunks = Enumerable.Range(0, partialFileInfoCache.PartialFileInfo.NumberOfChunks);
            await _filePersistenceService.CommitSavedChunks(userId, partialFileInfoCache.FileGuid, allChunks, file.MimeType, true, cancellationToken);

            file.FileStatus = FileStatus.Completed;

            _unitOfWork.Repository<File>().Update(file);

            lock (partialFileInfoCache.PartialFileInfo)
            {
                partialFileInfoCache.IsJunk = true;
                partialFileInfoCache.IsDirty = false;
                _unitOfWork.Repository<PartialFileInfo>().Remove(partialFileInfoCache.PartialFileInfo);
            }

            await _unitOfWork.Complete(cancellationToken);

            return Result.Success();
        }
        
        public async Task<(Result result, IEnumerable<int> missingChunkIndexes)> GetMissingFileChunks(int userId,
            int fileId,
            CancellationToken cancellationToken = default)
        {
            if (!UserFileCache.TryGetValue((userId, fileId), out var partialFileInfoCache))
            {
                File? file;
                (partialFileInfoCache, file) = await GetFileAndPartialFileInfoCacheThreadSafeAsync(userId, fileId, cancellationToken);

                if (file is null || file.UserId != userId)
                    return (Result.Failure("File does not exist or you do not have access"), Array.Empty<int>());

                if (file.IsDirectory)
                    return (Result.Failure("Directory can't have missing chunks"), Array.Empty<int>());

                if (file.FileStatus == FileStatus.Completed)
                    return (Result.Failure("Completed file can't have missing chunks"), Array.Empty<int>());

                if (file.PartialFileInfo is null)
                    return (Result.Failure("File does not contain 'PartialFileInfo'"), Array.Empty<int>());
            }

            var missingChunks =
                partialFileInfoCache!.PartialFileInfo.PersistenceMap.GetAllIndexesWithValue(true,
                    maxIndex: partialFileInfoCache.PartialFileInfo.NumberOfChunks - 1);

            return (Result.Success(), missingChunks);
        }
        
        public async Task<Result> UpdatePartialFileInfoAsync(int userId, int fileId)
        {
            var key = (userId, fileId);

            if (!UserFileCache.TryGetValue(key, out var cache)) return Result.Failure("'PartialFileInfo' can not be found");
            
            lock (cache.PartialFileInfo)
            {
                if(cache.IsJunk) 
                    return Result.Failure("'PartialFileInfo' can't be persisted file upload is complete");
                    
                _unitOfWork.Repository<PartialFileInfo>().Update(cache.PartialFileInfo);
                cache.IsDirty = false;
            }

            await _unitOfWork.Complete();

            return Result.Success();
        }

        public void CancelFileUpload(int userId, int fileId)
        {
            var key = (userId, fileId);

            if (UserFileCache.TryGetValue(key, out var userFileCacheValue))
            {
                userFileCacheValue.IsJunk = true;
            }
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
        
        private async Task<(PartialFileInfoCache? PartialFileInfoCache, File? File)> GetFileAndPartialFileInfoCacheThreadSafeAsync(
            int userId,
            int fileId,
            CancellationToken cancellationToken)
        {
            (PartialFileInfoCache? PartialFileInfoCache, File? File) fileAndPartialFileInfoCache = (null, null);
            var key = (userId, fileId);

            fileAndPartialFileInfoCache.PartialFileInfoCache =  await UserFileCache.GetOrAddAsync(
                key,
                async () =>
                    {
                        //TODO there is an error during initialization
                        fileAndPartialFileInfoCache.File = (await _unitOfWork.Repository<File>().FindAsync(
                            new FindFileByIdIncludePartialFileInfoSpecs(fileId),
                            cancellationToken)).SingleOrDefault();

                        if (fileAndPartialFileInfoCache.File?.PartialFileInfo is not null)
                            return new PartialFileInfoCache(
                                userId,
                                fileAndPartialFileInfoCache.File.FileGuid!.Value,
                                fileAndPartialFileInfoCache.File.PartialFileInfo);
                        return null;
                    });

            return fileAndPartialFileInfoCache;
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

        internal static async Task SaveCacheData(IUnitOfWork unitOfWork, IFilePersistenceService filePersistenceService, CancellationToken cancellationToken)
        {
            foreach (var cache in UserFileCache.Where(t => t.Value.IsDirty).Select(kvp => kvp.Value))
            {
                int[] uploadChunks;
                lock (cache.PartialFileInfo)
                {
                    if(cache.IsJunk) 
                        continue;
                    
                    unitOfWork.Repository<PartialFileInfo>().Update(cache.PartialFileInfo);
                    cache.IsDirty = false;
                    
                    uploadChunks =
                        cache.PartialFileInfo.PersistenceMap.GetAllIndexesWithValue(false,
                            maxIndex: cache.PartialFileInfo.NumberOfChunks - 1);
                }

                await filePersistenceService.CommitSavedChunks(cache.UserId, cache.FileGuid, uploadChunks, null, false, cancellationToken);
                
            }

            foreach (var toRemove in UserFileCache.Where(c => c.Value.IsJunk).Select(e => e.Key))
            {
                UserFileCache.TryRemove(toRemove);
            }

            await unitOfWork.Complete(cancellationToken);
        }

        private class PartialFileInfoCache {
            
            public PartialFileInfoCache(int userId, Guid fileGuid, PartialFileInfo partialFileInfo)
            {
                UserId = userId;
                FileGuid = fileGuid;
                PartialFileInfo = partialFileInfo;
            }

            public bool IsDirty { get; set; }
            public bool IsJunk { get; set; }
            public int UserId { get; set; }
            public Guid FileGuid { get; set; }
            public PartialFileInfo PartialFileInfo { get; set; }
        }

        private class PartialFileInfoCacheDictionary : IEnumerable<KeyValuePair<(int userId, int fileId), PartialFileInfoCache>>
         {
             private readonly ConcurrentDictionary<(int userId, int fileId), Lazy<Task<PartialFileInfoCache?>>> _cacheDictionary = new();


             public PartialFileInfoCache? GetValueOrDefault((int userId, int fileId) key)
             {
                 var cacheValue = _cacheDictionary.GetValueOrDefault(key);
                 return cacheValue?.IsValueCreated ?? false ? cacheValue.Value.Result : null;
             }

             public bool TryRemove((int userId, int fileId) key)
             {
                 return _cacheDictionary.TryRemove(key, out _);
             }
             
             
            public IEnumerator<KeyValuePair<(int userId, int fileId), PartialFileInfoCache>> GetEnumerator()
            {
                return _cacheDictionary
                    .Where(e => e.Value.IsValueCreated && e.Value.Value.Result is not null)
                    .Select( e => new KeyValuePair<(int userId, int fileId), PartialFileInfoCache>( e.Key, e.Value.Value.Result! ) )
                    .GetEnumerator();
            }
            
            IEnumerator IEnumerable.GetEnumerator()
            {
                return GetEnumerator();
            }
            
            public bool TryGetValue((int userId, int fileId) key, out PartialFileInfoCache value)
            {
                _cacheDictionary.TryGetValue(key, out var cacheValueLazy);
                var cacheValue = cacheValueLazy?.IsValueCreated ?? false ? cacheValueLazy.Value.Result : null;

                if (cacheValue is not null)
                {
                    value = cacheValue;
                    return true;
                }

                value = default!;
                return false;
            }
            
            public PartialFileInfoCache this[(int userId, int fileId) key]
            {
                set => _cacheDictionary[key] = new Lazy<Task<PartialFileInfoCache?>>(() => Task.FromResult(value)!);
            }

            public async Task<PartialFileInfoCache?> GetOrAddAsync(
                (int userId, int fileId) key,
                Func<Task<PartialFileInfoCache?>> valueFactory)
            {
                return await _cacheDictionary.GetOrAdd(key, new Lazy<Task<PartialFileInfoCache?>>(valueFactory)).Value;
            }
         }
    }
}