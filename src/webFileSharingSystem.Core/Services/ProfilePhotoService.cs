using System;
using System.Collections.Concurrent;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Options;
using System.Linq;
using webFileSharingSystem.Core.Specifications;

namespace webFileSharingSystem.Core.Services
{
    public class ProfilePhotoService : IProfilePhotoService
    {
        private const long DefaultMaxPhotoSizeBytes = 5 * 1024 * 1024;

        private static readonly ConcurrentDictionary<int, SemaphoreSlim> UserPhotoLocks = new();

        private readonly IUnitOfWork _unitOfWork;
        private readonly IProfilePhotoPersistenceService _profilePhotoPersistenceService;
        private readonly IOptions<StorageSettings> _storageSettings;

        public ProfilePhotoService(
            IUnitOfWork unitOfWork,
            IProfilePhotoPersistenceService profilePhotoPersistenceService,
            IOptions<StorageSettings> storageSettings)
        {
            _unitOfWork = unitOfWork;
            _profilePhotoPersistenceService = profilePhotoPersistenceService;
            _storageSettings = storageSettings;
        }

        public async Task<Result> UploadPhotoAsync(int userId, string? contentType, long contentLength, Stream content,
            CancellationToken cancellationToken = default)
        {
            var userLock = UserPhotoLocks.GetOrAdd(userId, _ => new SemaphoreSlim(1, 1));
            await userLock.WaitAsync(cancellationToken);
            try
            {
                if (contentLength <= 0)
                {
                    return Result.Failure("Profile photo is empty");
                }

                var maxPhotoSize = _storageSettings.Value.ProfilePhotoMaxSizeBytes > 0
                    ? _storageSettings.Value.ProfilePhotoMaxSizeBytes
                    : DefaultMaxPhotoSizeBytes;

                if (contentLength > maxPhotoSize)
                {
                    return Result.Failure($"Profile photo cannot be larger than {maxPhotoSize} bytes");
                }

                await using var photoBuffer = new MemoryStream();
                await content.CopyToAsync(photoBuffer, cancellationToken);

                var signatureValidation = ValidateImageSignature(photoBuffer.GetBuffer().AsSpan(0, (int)photoBuffer.Length));
                if (!signatureValidation.Result.Succeeded)
                {
                    return signatureValidation.Result;
                }

                if (!string.IsNullOrWhiteSpace(contentType) &&
                    !string.Equals(contentType, signatureValidation.DetectedMimeType, StringComparison.OrdinalIgnoreCase))
                {
                    return Result.Failure("Profile photo content type does not match file content");
                }

                var user = await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(userId, cancellationToken);
                if (user is null)
                {
                    return Result.Failure("User not found");
                }

                var previousPhotoGuid = user.PhotoFileGuid;
                var newPhotoGuid = Guid.NewGuid();
                photoBuffer.Position = 0;

                try
                {
                    await _profilePhotoPersistenceService.SavePhoto(userId, newPhotoGuid, photoBuffer, cancellationToken);

                    user.PhotoFileGuid = newPhotoGuid;
                    user.PhotoAccessId = Guid.NewGuid();
                    user.PhotoMimeType = signatureValidation.DetectedMimeType;
                    user.PhotoSize = (ulong)contentLength;
                    user.PhotoUpdatedAt = DateTime.UtcNow;

                    _unitOfWork.Repository<ApplicationUser>().Update(user);

                    if (await _unitOfWork.Complete(cancellationToken) <= 0)
                    {
                        await _profilePhotoPersistenceService.DeletePhoto(userId, newPhotoGuid);
                        return Result.Failure("Unable to save profile photo");
                    }

                    if (previousPhotoGuid.HasValue && previousPhotoGuid.Value != newPhotoGuid)
                    {
                        await _profilePhotoPersistenceService.DeletePhoto(userId, previousPhotoGuid.Value);
                    }

                    return Result.Success();
                }
                catch (Exception)
                {
                    await _profilePhotoPersistenceService.DeletePhoto(userId, newPhotoGuid);
                    return Result.Failure("Unable to save profile photo");
                }
            }
            finally
            {
                userLock.Release();
                UserPhotoLocks.TryRemove(userId, out _);
            }
        }

        public async Task<(Result Result, ProfilePhotoContent? Photo)> GetPhotoAsync(int userId,
            CancellationToken cancellationToken = default)
        {
            var user = await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(userId, cancellationToken);
            if (user is null)
            {
                return (Result.Failure("User not found"), null);
            }

            if (!user.PhotoFileGuid.HasValue)
            {
                return (Result.Failure("User does not have profile photo"), null);
            }

            var stream = await _profilePhotoPersistenceService.GetPhotoStream(userId, user.PhotoFileGuid.Value, cancellationToken);
            var photo = new ProfilePhotoContent
            {
                Content = stream,
                ContentType = string.IsNullOrWhiteSpace(user.PhotoMimeType) ? "application/octet-stream" : user.PhotoMimeType
            };

            return (Result.Success(), photo);
        }

        public async Task<(Result Result, ProfilePhotoContent? Photo)> GetPhotoByAccessIdAsync(Guid photoAccessId,
            CancellationToken cancellationToken = default)
        {
            var users = await _unitOfWork.Repository<ApplicationUser>()
                .FindAsync(new FindUserByPhotoAccessIdSpecs(photoAccessId), cancellationToken);

            var user = users.SingleOrDefault();
            if (user is null)
            {
                return (Result.Failure("Profile photo not found"), null);
            }

            return await GetPhotoAsync(user.Id, cancellationToken);
        }

        public async Task<Result> DeletePhotoAsync(int userId, CancellationToken cancellationToken = default)
        {
            var userLock = UserPhotoLocks.GetOrAdd(userId, _ => new SemaphoreSlim(1, 1));
            await userLock.WaitAsync(cancellationToken);
            try
            {
                var user = await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(userId, cancellationToken);
                if (user is null)
                {
                    return Result.Failure("User not found");
                }

                if (!user.PhotoFileGuid.HasValue)
                {
                    return Result.Success();
                }

                var previousPhotoGuid = user.PhotoFileGuid.Value;
                user.PhotoFileGuid = null;
                user.PhotoAccessId = null;
                user.PhotoMimeType = null;
                user.PhotoSize = null;
                user.PhotoUpdatedAt = DateTime.UtcNow;

                _unitOfWork.Repository<ApplicationUser>().Update(user);
                if (await _unitOfWork.Complete(cancellationToken) <= 0)
                {
                    return Result.Failure("Unable to delete profile photo");
                }

                try
                {
                    await _profilePhotoPersistenceService.DeletePhoto(userId, previousPhotoGuid);
                }
                catch (Exception)
                {
                    return Result.Failure("Profile photo metadata deleted but file cleanup failed");
                }

                return Result.Success();
            }
            finally
            {
                userLock.Release();
                UserPhotoLocks.TryRemove(userId, out _);
            }
        }

        private static (Result Result, string DetectedMimeType) ValidateImageSignature(ReadOnlySpan<byte> content)
        {
            if (content.Length < 8)
            {
                return (Result.Failure("Unsupported profile photo format"), string.Empty);
            }

            if (IsJpeg(content))
            {
                return (Result.Success(), "image/jpeg");
            }

            if (IsPng(content))
            {
                return (Result.Success(), "image/png");
            }

            if (IsWebp(content))
            {
                return (Result.Success(), "image/webp");
            }

            return (Result.Failure("Unsupported profile photo format"), string.Empty);
        }

        private static bool IsJpeg(ReadOnlySpan<byte> content)
        {
            return content.Length >= 3 &&
                   content[0] == 0xFF &&
                   content[1] == 0xD8 &&
                   content[2] == 0xFF;
        }

        private static bool IsPng(ReadOnlySpan<byte> content)
        {
            return content.Length >= 8 &&
                   content[0] == 0x89 &&
                   content[1] == 0x50 &&
                   content[2] == 0x4E &&
                   content[3] == 0x47 &&
                   content[4] == 0x0D &&
                   content[5] == 0x0A &&
                   content[6] == 0x1A &&
                   content[7] == 0x0A;
        }

        private static bool IsWebp(ReadOnlySpan<byte> content)
        {
            return content.Length >= 12 &&
                   content[0] == 0x52 && // R
                   content[1] == 0x49 && // I
                   content[2] == 0x46 && // F
                   content[3] == 0x46 && // F
                   content[8] == 0x57 && // W
                   content[9] == 0x45 && // E
                   content[10] == 0x42 && // B
                   content[11] == 0x50; // P
        }
    }
}