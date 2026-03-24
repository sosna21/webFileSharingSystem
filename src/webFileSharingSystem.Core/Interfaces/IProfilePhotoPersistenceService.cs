using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface IProfilePhotoPersistenceService
    {
        Task SavePhoto(int userId, Guid photoGuid, Stream data, CancellationToken cancellationToken = default);

        Task<Stream> GetPhotoStream(int userId, Guid photoGuid, CancellationToken cancellationToken = default);

        Task DeletePhoto(int userId, Guid photoGuid);
    }
}
