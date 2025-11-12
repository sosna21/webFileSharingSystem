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
    public class ShareService : IShareService
    {
        private readonly IUnitOfWork _unitOfWork;

        public ShareService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<(Result<OperationResult>, Share?)> AddShareAsync(int fileId, string userNameToShareWith, ShareAccessMode accessMode,
            DateTime? validUntil, int currentUserId, CancellationToken cancellationToken = default)
        {
            if (validUntil.HasValue && validUntil.Value <= DateTime.UtcNow.AddSeconds(40)) return (Result.Failure(OperationResult.BadRequest, "Valid until date must be in the future"), null);

            var applicationUser = (await _unitOfWork.Repository<ApplicationUser>()
                    .FindAsync(new FindUserByUserNameSpecs(userNameToShareWith), cancellationToken))
                .SingleOrDefault();

            if (applicationUser is null) return (Result.Failure(OperationResult.BadRequest, "Ups, something went wrong"), null);

            if (currentUserId == applicationUser.Id) return (Result.Failure(OperationResult.BadRequest, "You can't share file with yourself"), null);

            var fileToShare = await _unitOfWork.Repository<File>().FindByIdAsync(fileId, cancellationToken);
            if (fileToShare is null) return (Result.Failure(OperationResult.BadRequest, "File doesn't exist or you do not have access"), null);

            var existingShare = (await _unitOfWork.Repository<Share>()
                    .FindAsync(new FindSharesByWithUserIdAndFileIdSpecs(applicationUser.Id, fileId), cancellationToken))
                .SingleOrDefault();

            if (existingShare is not null) return (Result.Failure(OperationResult.BadRequest, "This file is already shared with that user"), null);

            var newShare = new Share
            {
                SharedByUserId = currentUserId,
                SharedWithUserId = applicationUser.Id,
                FileId = fileId,
                AccessMode = accessMode,
                ValidUntil = validUntil ?? DateTime.MaxValue,
            };
            _unitOfWork.Repository<Share>().Add(newShare);

            fileToShare.IsShared = true;
            _unitOfWork.Repository<File>().Update(fileToShare);

            return await _unitOfWork.Complete(cancellationToken) > 0
                ? (Result.Success<OperationResult>(), newShare)
                : (Result.Failure(OperationResult.Exception, "Problem with adding share"), null);
        }

        public async Task<(Result<OperationResult>, Share? updatedShare)> UpdateShareAsync(int shareId, ShareAccessMode accessMode, DateTime? validUntil,
            int currentUserId, CancellationToken cancellationToken = default)
        {
            if (validUntil.HasValue && validUntil.Value <= DateTime.UtcNow.AddSeconds(40)) return (Result.Failure(OperationResult.BadRequest, "Valid until date must be in the future"), null);
            var share = await _unitOfWork.Repository<Share>().FindByIdAsync(shareId, cancellationToken);
            if (share is null) return (Result.Failure(OperationResult.BadRequest, "Share doesn't exist or you do not have access"), null);

            share.AccessMode = accessMode;
            share.ValidUntil = validUntil ?? DateTime.MaxValue;

            _unitOfWork.Repository<Share>().Update(share);

            return await _unitOfWork.Complete(cancellationToken) > 0
                ? (Result.Success<OperationResult>(), share)
                : (Result.Failure(OperationResult.Exception, "Problem with updating share"), null);
        }

        public async Task<Result<OperationResult>> RemoveShareByFileIdAsync(int fileId, int userId, CancellationToken cancellationToken = default)
        {
            var shareToRemove = (await _unitOfWork.Repository<Share>()
                .FindAsync(new FindSharesByWithUserIdAndFileIdSpecs(userId, fileId), cancellationToken)).FirstOrDefault();

            if (shareToRemove is null) return Result.Failure(OperationResult.BadRequest, "To delete this share you must delete whole shared folder.");

            _unitOfWork.Repository<Share>().Remove(shareToRemove);

            if (await _unitOfWork.Repository<Share>().CountAsync(share => share.FileId == shareToRemove.FileId, cancellationToken) <= 1)
            {
                var fileToStopShare = await _unitOfWork.Repository<File>().FindByIdAsync(shareToRemove.FileId, cancellationToken);
                if (fileToStopShare is not null)
                {
                    fileToStopShare.IsShared = false;
                    _unitOfWork.Repository<File>().Update(fileToStopShare);
                }
            }

            return await _unitOfWork.Complete(cancellationToken) > 0
                ? Result.Success<OperationResult>()
                : Result.Failure(OperationResult.Exception, "Problem with removing this share/s");
        }

        public async Task<Result<OperationResult>> DeleteShareAsync(int shareId, int userId, CancellationToken cancellationToken = default)
        {
            var shareToDelete = await _unitOfWork.Repository<Share>().FindByIdAsync(shareId, cancellationToken);
            if (shareToDelete is null) return Result.Failure(OperationResult.BadRequest, "File is not shared with anybody or you do not have access");
            if (shareToDelete.SharedByUserId != userId && shareToDelete.SharedWithUserId != userId)
                return Result.Failure(OperationResult.Unauthorized, "File is not shared with anybody or you do not have access");

            _unitOfWork.Repository<Share>().Remove(shareToDelete);

            if (await _unitOfWork.Repository<Share>().CountAsync(share => share.FileId == shareToDelete.FileId, cancellationToken) <= 1)
            {
                var fileToStopShare = await _unitOfWork.Repository<File>().FindByIdAsync(shareToDelete.FileId, cancellationToken);
                if (fileToStopShare is not null)
                {
                    fileToStopShare.IsShared = false;
                    _unitOfWork.Repository<File>().Update(fileToStopShare);
                }
            }

            return await _unitOfWork.Complete(cancellationToken) > 0
                ? Result.Success<OperationResult>()
                : Result.Failure(OperationResult.Exception, "Problem with deleting the share");
        }

        public async Task<(Result<OperationResult>, IEnumerable<Share>)> GetSharesForFileAsync(int fileId, int userId,
            CancellationToken cancellationToken = default)
        {
            var shares = await _unitOfWork.Repository<Share>()
                .FindAsync(new GetShareByUserAndFileIdSpecs(userId, fileId), cancellationToken);

            return (Result.Success<OperationResult>(), shares);
        }
    }
}
