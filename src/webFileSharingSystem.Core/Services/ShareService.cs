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

            var existingNonRevokedShare = (await _unitOfWork.Repository<Share>()
                    .FindAsync(new FindNonRevokedShareBySharedWithUserIdAndFileIdSpecs(applicationUser.Id, fileId), cancellationToken))
                .SingleOrDefault();

            if (existingNonRevokedShare is not null)
            {
                var isActive = existingNonRevokedShare.ValidUntil is null || existingNonRevokedShare.ValidUntil.Value > DateTime.UtcNow;
                if (isActive)
                    return (Result.Failure(OperationResult.BadRequest, "This file is already shared with that user"), null);

                existingNonRevokedShare.RevokedAt = DateTime.UtcNow;
                _unitOfWork.Repository<Share>().Update(existingNonRevokedShare);

                if (await _unitOfWork.Complete(cancellationToken) <= 0)
                    return (Result.Failure(OperationResult.Exception, "Problem with replacing expired share"), null);
            }

            var newShare = new Share
            {
                SharedByUserId = currentUserId,
                SharedWithUserId = applicationUser.Id,
                FileId = fileId,
                AccessMode = accessMode,
                ValidUntil = validUntil
            };
            _unitOfWork.Repository<Share>().Add(newShare);

            return await _unitOfWork.Complete(cancellationToken) > 0
                ? (Result.Success<OperationResult>(), newShare)
                : (Result.Failure(OperationResult.Exception, "Problem with adding share"), null);
        }

        public async Task<(Result<OperationResult>, Share? updatedShare)> UpdateShareAsync(int shareId,
            ShareAccessMode accessMode, DateTime? validUntil,
            int currentUserId, CancellationToken cancellationToken = default)
        {
            if (validUntil.HasValue && validUntil.Value <= DateTime.UtcNow.AddSeconds(40))
                return (Result.Failure(OperationResult.BadRequest, "Valid until date must be in the future"), null);
            var share = (await _unitOfWork.Repository<Share>().FindAsync(new FindActiveShareByIdSpecs(shareId), cancellationToken)).SingleOrDefault();
            if (share is null || share.SharedByUserId != currentUserId)
                return (Result.Failure(OperationResult.BadRequest, "Share doesn't exist, already expired or you do not have access"),
                    null);
            
            share.AccessMode = accessMode;
            share.ValidUntil = validUntil;

            _unitOfWork.Repository<Share>().Update(share);

            return await _unitOfWork.Complete(cancellationToken) > 0
                ? (Result.Success<OperationResult>(), share)
                : (Result.Failure(OperationResult.Exception, "Problem with updating share"), null);
        }

        public async Task<Result<OperationResult>> RemoveShareByFileIdAsync(int fileId, int userId, CancellationToken cancellationToken = default)
        {
            var shareToRemove = (await _unitOfWork.Repository<Share>()
                .FindAsync(new FindActiveSharesBySharedWithUserIdAndFileIdSpecs(userId, fileId), cancellationToken)).FirstOrDefault();

            if (shareToRemove is null) return Result.Failure(OperationResult.BadRequest, "To delete this share you must delete whole shared folder.");

            shareToRemove.RevokedAt = DateTime.UtcNow;
            _unitOfWork.Repository<Share>().Update(shareToRemove);

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

            shareToDelete.RevokedAt = DateTime.UtcNow;
            _unitOfWork.Repository<Share>().Update(shareToDelete);

            return await _unitOfWork.Complete(cancellationToken) > 0
                ? Result.Success<OperationResult>()
                : Result.Failure(OperationResult.Exception, "Problem with deleting the share");
        }

        public async Task<(Result<OperationResult>, IEnumerable<Share>)> GetSharesForFileAsync(int fileId, int userId,
            CancellationToken cancellationToken = default)
        {
            var shares = await _unitOfWork.Repository<Share>()
                .FindAsync(new FindActiveSharesByUserIdAndFileIdSpecs(userId, fileId), cancellationToken);

            return (Result.Success<OperationResult>(), shares);
        }
    }
}
