using System.IO;
using System;
using System.Threading;
using System.Threading.Tasks;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface IProfilePhotoService
    {
        Task<Result> UploadPhotoAsync(int userId, string? contentType, long contentLength, Stream content,
            CancellationToken cancellationToken = default);

        Task<(Result Result, ProfilePhotoContent? Photo)> GetPhotoAsync(int userId,
            CancellationToken cancellationToken = default);

        Task<(Result Result, ProfilePhotoContent? Photo)> GetPhotoByAccessIdAsync(Guid photoAccessId,
            CancellationToken cancellationToken = default);

        Task<Result> DeletePhotoAsync(int userId, CancellationToken cancellationToken = default);
    }
}
