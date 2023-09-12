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

        public FileService(IUnitOfWork unitOfWork, IGuardService guard, IFilePersistenceService filePersistenceService, IUploadService uploadService)
        {
            _unitOfWork = unitOfWork;
            _guard = guard;
            _filePersistenceService = filePersistenceService;
            _uploadService = uploadService;
        }

        public async Task<(Result<OperationResult>, IEnumerable<FilePathPart>?)> GetPathToFileAsync(int fileId,
            int userId, CancellationToken cancellationToken = default)
        {
            var fileToGetPath = await _unitOfWork.Repository<File>().FindByIdAsync(fileId, cancellationToken);
            if (fileToGetPath is null) return (Result.Failure(OperationResult.BadRequest, "File not found"), null);

            if (!await _guard.UserCanPerform(userId, fileToGetPath, ShareAccessMode.ReadOnly, cancellationToken))
                return (Result.Failure(OperationResult.Unauthorized, "You are not authorized to get file path"), null);

            var filePathParts =
                await _unitOfWork.CustomQueriesRepository().FindPathToAllParents(fileId, cancellationToken);

            return (Result.Success<OperationResult>(), filePathParts.Reverse());
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

        public async Task<(Result<OperationResult>, File?)> CreateDirectoryAsync(int? parentId, int userId, string directoryName,
            CancellationToken cancellationToken = default)
        {
            var file = new File
            {
                FileName = directoryName,
                IsDirectory = true,
                ParentId = parentId,
                UserId = userId
            };

            if (!await _guard.UserCanPerform(userId, file, ShareAccessMode.ReadWrite, cancellationToken))
                return (Result.Failure(OperationResult.Unauthorized, "You are not authorized to create directory"), null);

            _unitOfWork.Repository<File>().Add(file);

            return await _unitOfWork.Complete(cancellationToken) > 0
                ? (Result.Success<OperationResult>(), file)
                : (Result.Failure(OperationResult.Exception, "Problem with creating directory"), null);
        }

        public async Task<Result<OperationResult>> DeleteFileAsync(int fileId, int userId,
            CancellationToken cancellationToken = default)
        {
            var fileToDelete = await _unitOfWork.Repository<File>().FindByIdAsync(fileId, cancellationToken);
            if (fileToDelete is null) return Result.Failure(OperationResult.BadRequest, "File not found");
            if (!await _guard.UserCanPerform(userId, fileToDelete, ShareAccessMode.FullAccess, cancellationToken))
                return Result.Failure(OperationResult.Unauthorized, "You are not authorized to remove that file");
            
            _uploadService.CancelFileUpload(userId, fileId);

            _unitOfWork.Repository<File>().Remove(fileToDelete);

            if (fileToDelete.ParentId is not null)
            {
                await UpdateParentFileSizes(fileToDelete.ParentId.Value, -(long) fileToDelete.Size, cancellationToken);
            }

            var fileOwnerUseSpaceUpdateResult =
                await UpdateUserUsedSpace(fileToDelete.UserId, -(long) fileToDelete.Size, cancellationToken);

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

        public async Task<Result<OperationResult>> DeleteDirectoryAsync(int directoryFileId, int userId,
            CancellationToken cancellationToken = default)
        {
            var directoryToDelete =
                await _unitOfWork.Repository<File>().FindByIdAsync(directoryFileId, cancellationToken);

            if (directoryToDelete is null) return Result.Failure(OperationResult.BadRequest, "Directory not found");
            if (!await _guard.UserCanPerform(userId, directoryToDelete, ShareAccessMode.FullAccess, cancellationToken))
                return Result.Failure(OperationResult.Unauthorized, "You are not authorized to remove that directory");

            var filesToRemove = await _unitOfWork.CustomQueriesRepository()
                .GetListOfAllChildrenAsFiles(directoryFileId, cancellationToken);

            _unitOfWork.Repository<File>().RemoveRange(filesToRemove);

            if (directoryToDelete.ParentId is not null)
            {
                await UpdateParentFileSizes(directoryToDelete.ParentId.Value, -(long) directoryToDelete.Size,
                    cancellationToken);
            }

            var directoryOwnerUseSpaceUpdateResult =
                await UpdateUserUsedSpace(directoryToDelete.UserId, -(long) directoryToDelete.Size,
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

        public async Task<Result<OperationResult>> MoveFilesAsync(int? newParentId, IEnumerable<int> fileIds,
            int userId, CancellationToken cancellationToken = default)
        {
            var newOwnerUserId = userId;
            if (newParentId is not null)
            {
                var parentFile =
                    await _unitOfWork.Repository<File>().FindByIdAsync(newParentId.Value, cancellationToken);
                if (parentFile is null) return Result.Failure(OperationResult.BadRequest, "Parent directory not found");
                if (!parentFile.IsDirectory)
                    return Result.Failure(OperationResult.BadRequest, "Parent file is not a directory");
                newOwnerUserId = parentFile.UserId;

                if (!await _guard.UserCanPerform(userId, parentFile, ShareAccessMode.ReadWrite, cancellationToken))
                    return Result.Failure(OperationResult.Unauthorized, "You are not authorized to move some files");
            }

            var filesToMove = (await _unitOfWork.Repository<File>()
                .FindAsync(new FindFilesByFileIdsSpecs(fileIds), cancellationToken)).ToList();

            if (fileIds.Except(filesToMove.Select(f => f.Id)).Any())
                return Result.Failure(OperationResult.BadRequest, "Some files not found");

            var filesToMoveTotalSIze = filesToMove.Sum(f => (long) f.Size);

            var directoryOwnerUseSpaceUpdateResult =
                await UpdateUserUsedSpace(newOwnerUserId, filesToMoveTotalSIze,
                    cancellationToken);

            if (!directoryOwnerUseSpaceUpdateResult.Succeeded)
                return Result.Failure(OperationResult.BadRequest, directoryOwnerUseSpaceUpdateResult.Errors);

            var oldOwnersFileSizesMoved = new Dictionary<int, long>();

            foreach (var fileToMove in filesToMove)
            {
                if (!await _guard.UserCanPerform(userId, fileToMove, ShareAccessMode.ReadWrite, cancellationToken))
                    return Result.Failure(OperationResult.Unauthorized, "You are not authorized to move some files");

                if (fileToMove.ParentId is not null)
                {
                    await UpdateParentFileSizes(fileToMove.ParentId.Value, -(long) fileToMove.Size,
                        cancellationToken);
                }

                fileToMove.ParentId = newParentId;

                if (newParentId is not null)
                {
                    await UpdateParentFileSizes(newParentId.Value, (long) fileToMove.Size,
                        cancellationToken);
                }

                _unitOfWork.Repository<File>().Update(fileToMove);

                if (oldOwnersFileSizesMoved.ContainsKey(fileToMove.UserId))
                    oldOwnersFileSizesMoved[fileToMove.UserId] += (long) fileToMove.Size;
                else
                    oldOwnersFileSizesMoved[fileToMove.UserId] = (long) fileToMove.Size;
            }

            foreach (var (oldUserId, totalFilesSize) in oldOwnersFileSizesMoved)
            {
                var oldOwnerUseSpaceUpdateResult =
                    await UpdateUserUsedSpace(oldUserId, totalFilesSize,
                        cancellationToken);

                if (!oldOwnerUseSpaceUpdateResult.Succeeded)
                    return Result.Failure(OperationResult.BadRequest, directoryOwnerUseSpaceUpdateResult.Errors);
            }

            return await _unitOfWork.Complete(cancellationToken) > 0
                ? Result.Success<OperationResult>()
                : Result.Failure(OperationResult.Exception, "Problem with moving some files");
        }

        public async Task<Result<OperationResult>> CopyFilesAsync(int? newParentId, IEnumerable<int> fileIds,
            int userId,
            CancellationToken cancellationToken = default)
        {
            var newOwnerUserId = userId;
            if (newParentId is not null)
            {
                var parentFile =
                    await _unitOfWork.Repository<File>().FindByIdAsync(newParentId.Value, cancellationToken);
                if (parentFile is null) return Result.Failure(OperationResult.BadRequest, "Parent directory not found");
                if (!parentFile.IsDirectory)
                    return Result.Failure(OperationResult.BadRequest, "Parent file is not a directory");
                newOwnerUserId = parentFile.UserId;

                if (!await _guard.UserCanPerform(userId, parentFile, ShareAccessMode.ReadWrite, cancellationToken))
                    return Result.Failure(OperationResult.Unauthorized, "You are not authorized to copy some files");
            }

            var filesToCopy = (await _unitOfWork.Repository<File>()
                .FindAsync(new FindFilesByFileIdsSpecs(fileIds), cancellationToken)).ToList();

            if (fileIds.Except(filesToCopy.Select(f => f.Id)).Any())
                return Result.Failure(OperationResult.BadRequest, "Some files not found");

            var filesToCopyTotalSize = filesToCopy.Sum(f => (long) f.Size);

            var directoryOwnerUseSpaceUpdateResult =
                await UpdateUserUsedSpace(newOwnerUserId, filesToCopyTotalSize,
                    cancellationToken);

            if (!directoryOwnerUseSpaceUpdateResult.Succeeded)
                return Result.Failure(OperationResult.BadRequest, directoryOwnerUseSpaceUpdateResult.Errors);

            foreach (var fileToCopy in filesToCopy)
            {

                if (!await _guard.UserCanPerform(userId, fileToCopy, ShareAccessMode.ReadWrite, cancellationToken))
                    return Result.Failure(OperationResult.Unauthorized, "You are not authorized to move some files");

                var file = new File
                {
                    UserId = newOwnerUserId,
                    ParentId = newParentId,
                    FileName = fileToCopy.FileName,
                    MimeType = fileToCopy.MimeType,
                    Size = fileToCopy.Size,
                    IsDirectory = fileToCopy.IsDirectory,
                    FileGuid = fileToCopy.FileGuid,
                    FileStatus = FileStatus.Completed
                };

                _unitOfWork.Repository<File>().Add(file);

                if (newParentId is not null)
                {
                    await UpdateParentFileSizes(newParentId.Value, (long) fileToCopy.Size,
                        cancellationToken);
                }
            }

            return await _unitOfWork.Complete(cancellationToken) > 0
                ? Result.Success<OperationResult>()
                : Result.Failure(OperationResult.Exception, "Problem with coping some files");
        }

        private async Task UpdateParentFileSizes(int parentId, long sizeToAdd, CancellationToken cancellationToken)
        {
            var filesToUpdateSize = await _unitOfWork.CustomQueriesRepository()
                .GetListOfAllParentsAsFiles(parentId, cancellationToken);

            foreach (var fileToUpdate in filesToUpdateSize)
            {
                // Uncomment and replace after changing file.Size to long from ulong
                // if (appUser.UsedSpace + sizeToAdd >= 0)
                //     appUser.UsedSpace += sizeToAdd;
                // else
                //     appUser.UsedSpace = 0; //TODO log error message

                switch (sizeToAdd)
                {
                    case < 0 when fileToUpdate.Size >= (ulong) -sizeToAdd:
                        fileToUpdate.Size -= (ulong) -sizeToAdd;
                        break;
                    case >= 0:
                        fileToUpdate.Size += (ulong) sizeToAdd;
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

            switch (sizeToAdd)
            {
                case < 0 when appUser.UsedSpace >= (ulong) -sizeToAdd:
                    appUser.UsedSpace -= (ulong) -sizeToAdd;
                    break;
                case >= 0 when appUser.UsedSpace + (ulong) sizeToAdd > appUser.Quota:
                    Result.Failure($"User does not have enough free space, userId: {userId}");
                    break;
                case >= 0:
                    appUser.UsedSpace += (ulong) sizeToAdd;
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