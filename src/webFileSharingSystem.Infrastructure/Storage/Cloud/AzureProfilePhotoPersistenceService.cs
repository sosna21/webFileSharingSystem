using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Azure.Storage.Blobs;
using webFileSharingSystem.Core.Interfaces;

namespace webFileSharingSystem.Infrastructure.Storage
{
    public class AzureProfilePhotoPersistenceService : IProfilePhotoPersistenceService
    {
        private const string ContainerName = "main-container";
        private readonly BlobServiceClient _blobServiceClient;

        public AzureProfilePhotoPersistenceService(BlobServiceClient blobServiceClient)
        {
            _blobServiceClient = blobServiceClient;
        }

        public async Task SavePhoto(int userId, Guid photoGuid, Stream data, CancellationToken cancellationToken = default)
        {
            var blobContainer = _blobServiceClient.GetBlobContainerClient(ContainerName);
            await blobContainer.CreateIfNotExistsAsync(cancellationToken: cancellationToken);

            var blobClient = blobContainer.GetBlobClient(GetPhotoBlobName(photoGuid));
            await blobClient.UploadAsync(data, overwrite: true, cancellationToken: cancellationToken);
        }

        public async Task<Stream> GetPhotoStream(int userId, Guid photoGuid, CancellationToken cancellationToken = default)
        {
            var blobContainer = _blobServiceClient.GetBlobContainerClient(ContainerName);
            var blobClient = blobContainer.GetBlobClient(GetPhotoBlobName(photoGuid));
            return await blobClient.OpenReadAsync(cancellationToken: cancellationToken);
        }

        public async Task DeletePhoto(int userId, Guid photoGuid)
        {
            var blobContainer = _blobServiceClient.GetBlobContainerClient(ContainerName);
            var blobClient = blobContainer.GetBlobClient(GetPhotoBlobName(photoGuid));
            await blobClient.DeleteIfExistsAsync();
        }

        private static string GetPhotoBlobName(Guid photoGuid)
        {
            return $"photos/{photoGuid}";
        }
    }
}
