using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Blobs.Specialized;
using webFileSharingSystem.Core.Interfaces;

namespace webFileSharingSystem.Infrastructure.Storage
{
    
    public class AzureFilePersistenceService : IFilePersistenceService
    {
        private const string ContainerPrefix = "userid-";
        private readonly BlobServiceClient _blobServiceClient;

        public AzureFilePersistenceService(BlobServiceClient blobServiceClient)
        {
            _blobServiceClient = blobServiceClient;
        }

        public async Task SaveChunk(int userId, Guid fileGuid, int chunkIndex, int chunkSize, Stream data,
            CancellationToken cancellationToken = default)
        {
            var blobContainer = _blobServiceClient.GetBlobContainerClient(GetContainerName(userId));
            var blockBlobClient = blobContainer.GetBlockBlobClient(fileGuid.ToString());
            
            var blockId = Convert.ToBase64String(Encoding.UTF8.GetBytes(chunkIndex.ToString("d6")));
            await blockBlobClient.StageBlockAsync(blockId, data, cancellationToken: cancellationToken);
        }

        public async Task CommitSavedChunks(int userId, Guid fileGuid, IEnumerable<int> chunkIndexes, string? fileContentType, CancellationToken cancellationToken = default)
        {
            var blobContainer = _blobServiceClient.GetBlobContainerClient(GetContainerName(userId));
            var blockBlobClient = blobContainer.GetBlockBlobClient(fileGuid.ToString());

            var savedBlockIds = chunkIndexes.Select(chunkIndex =>
                Convert.ToBase64String(Encoding.UTF8.GetBytes(chunkIndex.ToString("d6"))));
            
            var headers = new BlobHttpHeaders
            {
                ContentType = fileContentType
            };
            
            await blockBlobClient.CommitBlockListAsync(savedBlockIds, headers, cancellationToken: cancellationToken);
        }

        public async Task GetChunk(int userId, Guid fileGuid, int chunkSize, int chunkIndex, Stream outputStream,
            CancellationToken cancellationToken = default)
        {
            var blobContainer = _blobServiceClient.GetBlobContainerClient(GetContainerName(userId));
            var blobClient = blobContainer.GetBlobClient(fileGuid.ToString());

            var range = new HttpRange(chunkIndex * chunkSize, chunkSize);

            var blobStreamingResult =  await blobClient.DownloadStreamingAsync(range, cancellationToken: cancellationToken);

            await blobStreamingResult.Value.Content.CopyToAsync(outputStream, cancellationToken);
        }

        public async Task GenerateNewFile(int userId, Guid fileGuid)
        {
            var blobContainer = _blobServiceClient.GetBlobContainerClient(GetContainerName(userId));

            await blobContainer.CreateIfNotExistsAsync();
        }

        public async Task<Stream> GetFileStream(int userId, Guid fileGuid, CancellationToken cancellationToken = default)
        {
            var blobContainer = _blobServiceClient.GetBlobContainerClient(GetContainerName(userId));
            var blobClient = blobContainer.GetBlobClient(fileGuid.ToString());

            return await blobClient.OpenReadAsync(cancellationToken: cancellationToken);
        }
        
        public async Task DeleteExistingFile(int userId, Guid fileGuid)
        {
            var blobContainer = _blobServiceClient.GetBlobContainerClient(GetContainerName(userId));
            var blobClient = blobContainer.GetBlobClient(fileGuid.ToString());
            await blobClient.DeleteIfExistsAsync();
        }

        private static string GetContainerName(int userId) => ContainerPrefix + userId;
    }
}