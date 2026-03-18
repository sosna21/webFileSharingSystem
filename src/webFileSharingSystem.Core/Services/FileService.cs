using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Specifications;

namespace webFileSharingSystem.Core.Services
{
    public class FileService : IFileService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IGuardService _guard;
        private readonly IFilePersistenceService _filePersistenceService;
        private readonly IUploadService _uploadService;
        private readonly IUserLocks _userLocks;

        public FileService(IUnitOfWork unitOfWork, IGuardService guard, IFilePersistenceService filePersistenceService, IUploadService uploadService, IUserLocks userLocks)
        {
            _unitOfWork = unitOfWork;
            _guard = guard;
            _filePersistenceService = filePersistenceService;
            _uploadService = uploadService;
            _userLocks = userLocks;
        }

        public async Task<(Result<OperationResult>, IEnumerable<FilePathPart>?)> GetPathToFileAsync(int fileId,
            int userId, CancellationToken cancellationToken = default)
        {
            var fileToGetPath = await _unitOfWork.Repository<File>().FindByIdAsync(fileId, cancellationToken);
            if (fileToGetPath is null) return (Result.Failure(OperationResult.BadRequest, "File not found"), null);

            if (!await _guard.UserCanPerform(userId, fileToGetPath, ShareAccessMode.ReadOnly, cancellationToken))
                return (Result.Failure(OperationResult.Unauthorized, "You are not authorized to get file path for this file"), null);

            var filePathParts = fileToGetPath.UserId == userId
                ? await _unitOfWork.CustomQueriesRepository().FindPathToAllParentsForUserFile(fileId, cancellationToken)
                : await _unitOfWork.CustomQueriesRepository().FindPathToAllParentForSharedFile(userId, fileId, cancellationToken);
            
            return (Result.Success<OperationResult>(), filePathParts);
        }

        public async Task<Result<OperationResult>> RenameFileAsync(int fileId, int userId, string newName,
            CancellationToken cancellationToken = default)
        {
            var fileToUpdate = await _unitOfWork.Repository<File>().FindByIdAsync(fileId, cancellationToken);
            if (fileToUpdate is null) return Result.Failure(OperationResult.BadRequest, "File not found");

            if (!await _guard.UserCanPerform(userId, fileToUpdate, ShareAccessMode.ReadWrite, cancellationToken))
                return Result.Failure(OperationResult.Unauthorized, "You are not authorized to rename that file");

            fileToUpdate.FileName = newName;
            _unitOfWork.Repository<File>().Update(fileToUpdate);

            return await _unitOfWork.Complete(cancellationToken) > 0
                ? Result.Success<OperationResult>()
                : Result.Failure(OperationResult.Exception, "Problem with renaming the file");
        }

        public async Task<(Result<OperationResult> result, File? file)> CreateDirectoryAsync(int? parentId, int userId, string directoryName,
            CancellationToken cancellationToken = default)
        {
            if (parentId != null)
            {
                var parentDirectory =
                    await _unitOfWork.Repository<File>().FindByIdAsync(parentId.Value, cancellationToken);
                if (parentDirectory is null)
                    return  (Result.Failure(OperationResult.BadRequest, "Parent directory does not exist or you do not have access"), null);
                if (!await _guard.UserCanPerform(userId, parentDirectory, ShareAccessMode.ReadWrite, cancellationToken))
                    return (Result.Failure(OperationResult.Unauthorized, "You are not authorized to create directory"), null);
            }

            var file = new File
            {
                FileName = directoryName,
                IsDirectory = true,
                ParentId = parentId,
                UserId = userId
            };
            
            var isNameAvailable = !await _unitOfWork.Repository<File>().ContainsAsync(new GetFileByNameSpecs(userId, parentId, directoryName), cancellationToken);
            if (!isNameAvailable)
                return (Result.Failure(OperationResult.BadRequest, "Directory with that name already exists"), null);

            _unitOfWork.Repository<File>().Add(file);

            return await _unitOfWork.Complete(cancellationToken) > 0
                ? (Result.Success<OperationResult>(), file)
                : (Result.Failure(OperationResult.Exception, "Problem with creating directory"), null);
        }

        public async Task<Result<OperationResult>> DeleteAsync(int fileId, int userId, CancellationToken cancellationToken = default)
        {
            var fileToDelete = await _unitOfWork.Repository<File>().FindByIdAsync(fileId, cancellationToken);
            if (fileToDelete is null) return Result.Failure(OperationResult.BadRequest, "File not found");
            
            var releaser = await _userLocks.AcquireAsync(fileToDelete.UserId, cancellationToken);
            try
            {
                if (!await _guard.UserCanPerform(userId, fileToDelete, ShareAccessMode.FullAccess, cancellationToken))
                    return Result.Failure(OperationResult.Unauthorized, "You are not authorized to remove that file");

                return fileToDelete.IsDirectory
                    ? await DeleteDirectoryAsync(fileToDelete, userId, cancellationToken)
                    : await DeleteFileAsync(fileToDelete, userId, cancellationToken);
            }
            finally
            {
                releaser.Dispose();
            }
        }

        private async Task<Result<OperationResult>> DeleteFileAsync(File fileToDelete, int userId,
            CancellationToken cancellationToken = default)
        {
            _uploadService.CancelFileUpload(fileToDelete.CreatedBy, fileToDelete.Id);

            _unitOfWork.Repository<File>().Remove(fileToDelete);

            if (fileToDelete.ParentId is not null)
            {
                await UpdateParentFileSizes(fileToDelete.ParentId.Value, -(long)fileToDelete.Size, cancellationToken);
            }

            var fileOwnerUseSpaceUpdateResult =
                await UpdateUserUsedSpace(fileToDelete.UserId, -(long)fileToDelete.Size, cancellationToken);

            if (!fileOwnerUseSpaceUpdateResult.Succeeded)
                return Result.Failure(OperationResult.BadRequest, fileOwnerUseSpaceUpdateResult.Errors);

            var guidToRemove = fileToDelete.FileGuid!.Value;

            if (await _unitOfWork.Repository<File>().CountAsync(new FindFileByFileGuidSpecs(guidToRemove), cancellationToken) <= 1)
            {
                await _filePersistenceService.DeleteExistingFile(userId, guidToRemove);
            }

            return await _unitOfWork.Complete(cancellationToken) > 0
                ? Result.Success<OperationResult>()
                : Result.Failure(OperationResult.Exception, "Problem with deleting file");
        }

        private async Task<Result<OperationResult>> DeleteDirectoryAsync(File directoryToDelete, int userId,
            CancellationToken cancellationToken = default)
        {
            var filesToRemove = await _unitOfWork.CustomQueriesRepository()
                .GetListOfAllChildrenAsFiles(directoryToDelete.Id, cancellationToken);

            foreach (var file in filesToRemove)
                _uploadService.CancelFileUpload(file.CreatedBy, file.Id);

            _unitOfWork.Repository<File>().RemoveRange(filesToRemove);

            if (directoryToDelete.ParentId is not null)
            {
                await UpdateParentFileSizes(directoryToDelete.ParentId.Value, -(long)directoryToDelete.Size,
                    cancellationToken);
            }

            var directoryOwnerUseSpaceUpdateResult =
                await UpdateUserUsedSpace(directoryToDelete.UserId, -(long)directoryToDelete.Size,
                    cancellationToken);

            if (!directoryOwnerUseSpaceUpdateResult.Succeeded)
                return Result.Failure(OperationResult.BadRequest, directoryOwnerUseSpaceUpdateResult.Errors);

            var guidsToRemove = filesToRemove.Where(x => !x.IsDirectory).Select(x => x.FileGuid!.Value);

            var fileGuidsToRemove = await _unitOfWork.Repository<File>()
                .FindAsync(new CountFilesByFileGuidsSpecs(guidsToRemove), cancellationToken);

            foreach (var guidFilesCount in fileGuidsToRemove.Where(g => g.Count <= 1))
            {
                await _filePersistenceService.DeleteExistingFile(userId, guidFilesCount.FileGuid);
            }

            return await _unitOfWork.Complete(cancellationToken) > 0
                ? Result.Success<OperationResult>()
                : Result.Failure(OperationResult.Exception, "Problem with deleting a directory");
        }

        public async Task<(Result<OperationResult>, IEnumerable<FileOperationContext>?)> MoveFilesAsync(
            int? targetParentId,
            IEnumerable<int> fileIds,
            int userId,
            CancellationToken cancellationToken = default)
        {
            var targetUserId = userId;
            var enumeratedFileIds = fileIds.ToArray();

            if (targetParentId is not null)
            {
                var targetDirectory = await _unitOfWork.Repository<File>()
                    .FindByIdAsync(targetParentId.Value, cancellationToken);

                if (targetDirectory is null)
                    return (Result.Failure(OperationResult.BadRequest, "Target directory not found"), null);

                if (!targetDirectory.IsDirectory)
                    return (Result.Failure(OperationResult.BadRequest, "Target destination is not a directory"), null);

                if (!await _guard.UserCanPerform(userId, targetDirectory, ShareAccessMode.ReadWrite, cancellationToken))
                    return (Result.Failure(OperationResult.Unauthorized, "You are not authorized to add files to this directory"), null);

                var movedSet = new HashSet<int>(enumeratedFileIds);

                if (movedSet.Contains(targetParentId.Value))
                    return (Result.Failure(OperationResult.BadRequest, "The destination folder is the same as one of the moved folders"), null);

                var destinationAncestors =
                    await _unitOfWork.CustomQueriesRepository()
                        .GetListOfAllParentsAsFiles(targetParentId.Value, cancellationToken);

                if (destinationAncestors.Any(a => movedSet.Contains(a.Id)))
                    return (Result.Failure(OperationResult.BadRequest, "The destination folder is a subfolder of one of the moved folders"), null);

                targetUserId = targetDirectory.UserId;
            }

            var filesToMove = (await _unitOfWork.Repository<File>()
                    .FindAsync(new FindFilesByFileIdsSpecs(enumeratedFileIds), cancellationToken))
                .ToList();

            if (enumeratedFileIds.Except(filesToMove.Select(f => f.Id)).Any())
                return (Result.Failure(OperationResult.BadRequest, "Some files not found"), null);
            
            var usersToLock = filesToMove
                .Select(f => f.UserId)
                .Append(targetUserId)
                .Distinct()
                .OrderBy(id => id)
                .ToArray();

            var lockReleasers = new List<IDisposable>();
            var resultFileCtxList = new List<FileOperationContext>();

            try
            {
                foreach (var id in usersToLock)
                    lockReleasers.Add(await _userLocks.AcquireAsync(id, cancellationToken));

                foreach (var fileToMove in filesToMove)
                {
                    if (!await _guard.UserCanPerform(userId, fileToMove, ShareAccessMode.ReadWrite, cancellationToken))
                        return (Result.Failure(OperationResult.Unauthorized, "You are not authorized to move some files"), null);

                    var isMovingToAnotherUser = fileToMove.UserId != targetUserId;

                    if (isMovingToAnotherUser)
                    {
                        var updateResult = await UpdateUserUsedSpace(
                            fileToMove.UserId,
                            -(long)fileToMove.Size,
                            cancellationToken);

                        if (!updateResult.Succeeded)
                            return (Result.Failure(OperationResult.Exception, updateResult.Errors), null);

                        updateResult = await UpdateUserUsedSpace(
                            targetUserId,
                            (long)fileToMove.Size,
                            cancellationToken);

                        if (!updateResult.Succeeded)
                            return (Result.Failure(OperationResult.Exception, updateResult.Errors), null);

                        var sharesToRevoke = await _unitOfWork.Repository<Share>()
                            .FindAsync(new GetSharesByFileId(fileToMove.Id), cancellationToken);

                        var now = DateTime.UtcNow;
                        foreach (var share in sharesToRevoke)
                        {
                            share.RevokedAt = now;
                            _unitOfWork.Repository<Share>().Update(share);
                        }
                    }

                    if (fileToMove.ParentId is not null)
                        await UpdateParentFileSizes(fileToMove.ParentId.Value, -(long)fileToMove.Size, cancellationToken);

                    if (targetParentId is not null)
                        await UpdateParentFileSizes(targetParentId.Value, (long)fileToMove.Size, cancellationToken);

                    fileToMove.ParentId = targetParentId;
                    fileToMove.UserId = targetUserId;
                    _unitOfWork.Repository<File>().Update(fileToMove);

                    var isOwnFile = targetUserId == userId;
                    SharedFileSqlRow? parentShared = null;

                    if (!isOwnFile)
                        parentShared = await _unitOfWork.CustomQueriesRepository()
                            .GetSharedFileById(userId, targetParentId!.Value, cancellationToken);

                    var isShareExplicit =
                        !isMovingToAnotherUser &&
                        (await _unitOfWork.Repository<Share>()
                            .FindAsync(new FindSharesByUserIdAndFileIdSpecs(userId, fileToMove.Id), cancellationToken))
                        .Any();

                    resultFileCtxList.Add(new FileOperationContext
                    {
                        IsOwnFile = isOwnFile,
                        File = fileToMove,
                        AccessMode = parentShared?.AccessMode,
                        ValidUntil = parentShared?.ValidUntil,
                        SharedUserName = parentShared?.SharedUserName,
                        IsInherited = isShareExplicit
                    });
                }
            }
            finally
            {
                for (var i = lockReleasers.Count - 1; i >= 0; i--)
                    lockReleasers[i].Dispose();
            }

            return await _unitOfWork.Complete(cancellationToken) > 0
                ? (Result.Success<OperationResult>(), resultFileCtxList)
                : (Result.Failure(OperationResult.Exception, "Problem with moving some files"), null);
        }

        public async Task<(Result<OperationResult>, IEnumerable<FileOperationContext>?)> CopyFilesAsync(int? targetParentId,
            IEnumerable<int> fileIds,
            int userId,
            CancellationToken cancellationToken = default)
        {
            var targetUserId = userId;
            var enumeratedFileIds = fileIds.ToArray();

            if (targetParentId is not null)
            {
                var targetDirectory = await _unitOfWork.Repository<File>().FindByIdAsync(targetParentId.Value, cancellationToken);
                if (targetDirectory is null) return (Result.Failure(OperationResult.BadRequest, "Target directory not found"), null);
                if (!targetDirectory.IsDirectory)
                    return (Result.Failure(OperationResult.BadRequest, "Parent file is not a directory"), null);
                if (!await _guard.UserCanPerform(userId, targetDirectory, ShareAccessMode.ReadWrite, cancellationToken))
                    return (Result.Failure(OperationResult.Unauthorized, "You are not authorized to add files to this directory"), null);

                var copiedSet = new HashSet<int>(enumeratedFileIds);
                if (copiedSet.Contains(targetParentId.Value))
                    return (Result.Failure(OperationResult.BadRequest, "The destination folder is the same as one of the moved folders"), null);

                var destinationAncestors =
                    await _unitOfWork.CustomQueriesRepository().GetListOfAllParentsAsFiles(targetParentId.Value, cancellationToken);
                if (destinationAncestors.Any(destinationAncestor => copiedSet.Contains(destinationAncestor.Id)))
                {
                    return (Result.Failure(OperationResult.BadRequest, "The destination folder is a subfolder of one of the moved folders"), null);
                }

                targetUserId = targetDirectory.UserId; //file belongs to directory owner, not user performing action
            }

            var filesToCopy = (await _unitOfWork.Repository<File>()
                .FindAsync(new FindFilesByFileIdsSpecs(enumeratedFileIds), cancellationToken)).ToList();

            if (enumeratedFileIds.Except(filesToCopy.Select(f => f.Id)).Any())
                return (Result.Failure(OperationResult.BadRequest, "Some files not found"), null);

            var resultFileCtxList = new List<FileOperationContext>();
            // Lock target owner to protect quota + parent size consistency
            var releaser = await _userLocks.AcquireAsync(targetUserId, cancellationToken);
            try
            {
                var filesToCopyTotalSize = filesToCopy.Sum(f => (long)f.Size);

                var updateResult = await UpdateUserUsedSpace(targetUserId, filesToCopyTotalSize, cancellationToken);
                if (!updateResult.Succeeded)
                    return (Result.Failure(OperationResult.BadRequest, updateResult.Errors), null);

                foreach (var fileToCopy in filesToCopy)
                {
                    if (!await _guard.UserCanPerform(userId, fileToCopy, ShareAccessMode.ReadOnly, cancellationToken))
                        return (Result.Failure(OperationResult.Unauthorized, "You are not authorized to copy some files"), null);

                    var file = new File
                    {
                        UserId = targetUserId,
                        ParentId = targetParentId,
                        FileName = fileToCopy.FileName,
                        MimeType = fileToCopy.MimeType,
                        Size = fileToCopy.Size,
                        IsDirectory = fileToCopy.IsDirectory,
                        FileGuid = fileToCopy.FileGuid,
                        FileStatus = FileStatus.Completed
                    };

                    _unitOfWork.Repository<File>().Add(file);

                    var isOwnFile = targetUserId == userId;
                    SharedFileSqlRow? sharedFile = null;

                    if (!isOwnFile && targetParentId is not null)
                        sharedFile = await _unitOfWork.CustomQueriesRepository()
                            .GetSharedFileById(userId, targetParentId.Value, cancellationToken);

                    var ctx = new FileOperationContext
                    {
                        IsOwnFile = targetUserId == userId,
                        File = file,

                        // only if shared
                        AccessMode = sharedFile?.AccessMode,
                        ValidUntil = sharedFile?.ValidUntil,
                        SharedUserName = sharedFile?.SharedUserName,
                        IsInherited = sharedFile is not null,
                    };
                    resultFileCtxList.Add(ctx);

                    //If file is a directory we need to also copy all of its contents
                    if (file.IsDirectory)
                    {
                        var childFiles = await _unitOfWork.CustomQueriesRepository()
                            .GetListOfAllChildrenAsFiles(fileToCopy.Id, cancellationToken);

                        var allDescendants = childFiles.Where(x => x.Id != fileToCopy.Id).ToList();

                        if (allDescendants.Count == 0) continue;
                        var oldIdToNewFileMap = new Dictionary<int, File> { { fileToCopy.Id, file } };

                        foreach (var childDescendant in allDescendants)
                        {
                            var newChild = new File
                            {
                                UserId = targetUserId,
                                FileName = childDescendant.FileName,
                                MimeType = childDescendant.MimeType,
                                Size = childDescendant.Size,
                                IsDirectory = childDescendant.IsDirectory,
                                FileGuid = childDescendant.FileGuid,
                                FileStatus = FileStatus.Completed
                            };
                            oldIdToNewFileMap.Add(childDescendant.Id, newChild);
                        }

                        foreach (var childDescendant in allDescendants)
                        {
                            if (childDescendant.ParentId.HasValue &&
                                oldIdToNewFileMap.TryGetValue(childDescendant.ParentId.Value, out var parentFile))
                            {
                                var newChild = oldIdToNewFileMap[childDescendant.Id];
                                newChild.Parent = parentFile;
                                _unitOfWork.Repository<File>().Add(newChild);
                            }
                        }
                    }
                }

                if (targetParentId is not null)
                    await UpdateParentFileSizes(targetParentId.Value, filesToCopyTotalSize, cancellationToken);
            }
            finally
            {
                releaser.Dispose();
            }

            var result = await _unitOfWork.Complete(cancellationToken);
            return result > 0 || resultFileCtxList.Count > 0
                ? (Result.Success<OperationResult>(), resultFileCtxList)
                : (Result.Failure(OperationResult.Exception, "Problem with coping some files"), null);
        }

        private async Task UpdateParentFileSizes(int parentId, long sizeToAdd, CancellationToken cancellationToken)
        {
            var filesToUpdateSize = await _unitOfWork.CustomQueriesRepository()
                .GetListOfAllParentsAsFiles(parentId, cancellationToken);
            var castedSize = (ulong)Math.Abs(sizeToAdd);

            foreach (var fileToUpdate in filesToUpdateSize)
            {
                switch (sizeToAdd)
                {
                    case < 0 when fileToUpdate.Size >= castedSize:
                        fileToUpdate.Size -= castedSize;
                        break;
                    case >= 0:
                        fileToUpdate.Size += castedSize;
                        break;
                    default:
                        fileToUpdate.Size = 0; //TODO log error message
                        break;
                }

                _unitOfWork.Repository<File>().Update(fileToUpdate);
            }
        }

        private async Task<Result> UpdateUserUsedSpace(int userId, long sizeToAdd, CancellationToken cancellationToken)
        {
            var appUser = await _unitOfWork.Repository<ApplicationUser>()
                .FindByIdAsync(userId, cancellationToken);

            if (appUser is null) return Result.Failure($"User not found, userId: {userId}");
            var castedSize = (ulong)Math.Abs(sizeToAdd);

            switch (sizeToAdd)
            {
                case < 0 when appUser.UsedSpace >= castedSize:
                    appUser.UsedSpace -= castedSize;
                    break;
                case >= 0 when appUser.UsedSpace + castedSize > appUser.Quota:
                    return Result.Failure($"User does not have enough free space, userId: {userId}");
                case >= 0:
                    appUser.UsedSpace += castedSize;
                    break;
                default:
                    appUser.UsedSpace = 0; //TODO log error message
                    break;
            }

            _unitOfWork.Repository<ApplicationUser>().Update(appUser);

            return Result.Success();
        }
    }
}