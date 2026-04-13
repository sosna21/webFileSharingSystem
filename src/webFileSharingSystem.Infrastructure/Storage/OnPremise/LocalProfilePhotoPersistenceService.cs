using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Options;
using static System.IO.File;

namespace webFileSharingSystem.Infrastructure.Storage
{
    public class LocalProfilePhotoPersistenceService : IProfilePhotoPersistenceService
    {
        private readonly IOptions<StorageSettings> _settings;

        public LocalProfilePhotoPersistenceService(IOptions<StorageSettings> settings)
        {
            _settings = settings;
            Directory.CreateDirectory(GetPhotoDirectoryPath());
        }

        public async Task SavePhoto(int userId, Guid photoGuid, Stream data,
            CancellationToken cancellationToken = default)
        {
            var filePath = GetPhotoPath(photoGuid);
            await using var stream = new FileStream(
                filePath,
                FileMode.Create,
                FileAccess.Write,
                FileShare.None,
                4096,
                FileOptions.Asynchronous);

            await data.CopyToAsync(stream, cancellationToken);
        }

        public async Task<Stream> GetPhotoStream(int userId, Guid photoGuid,
            CancellationToken cancellationToken = default)
        {
            var filePath = GetPhotoPath(photoGuid);
            return await new ValueTask<Stream>(new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read,
                4096, FileOptions.Asynchronous));
        }

        public Task DeletePhoto(int userId, Guid photoGuid)
        {
            var filePath = GetPhotoPath(photoGuid);
            if (Exists(filePath))
            {
                Delete(filePath);
            }

            return Task.CompletedTask;
        }

        private string GetPhotoDirectoryPath()
        {
            return Path.Combine(_settings.Value.OnPremiseFileLocation, _settings.Value.ProfilePhotoSubdirectory);
        }

        private string GetPhotoPath(Guid photoGuid)
        {
            Directory.CreateDirectory(GetPhotoDirectoryPath());
            return Path.Combine(GetPhotoDirectoryPath(), photoGuid.ToString());
        }
    }
}
