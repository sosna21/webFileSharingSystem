using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Options;
using static System.IO.File;

namespace webFileSharingSystem.Infrastructure.Storage
{
    public class LocalFilePersistenceService : IFilePersistenceService
    {
        private readonly IOptions<StorageSettings> _settings;

        public LocalFilePersistenceService(IOptions<StorageSettings> settings)
        {
            _settings = settings;
        }

        public async Task<Stream> GetFileStream(int userId, Guid fileGuid, CancellationToken cancellationToken = default)
        {
            var filePath = Path.Combine(_settings.Value.OnPremiseFileLocation, userId.ToString(), fileGuid.ToString());
            return await new ValueTask<Stream>( new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read,
                4096, FileOptions.Asynchronous));
        }

        public async Task SaveChunk(int userId, Guid fileGuid, int chunkIndex, int chunkSize, Stream data,
            CancellationToken cancellationToken = default)
        {
            
            var filePath = Path.Combine(_settings.Value.OnPremiseFileLocation, userId.ToString(), fileGuid.ToString());

            await using var stream = new FileStream(filePath, FileMode.OpenOrCreate, FileAccess.Write,
                FileShare.Write,
                4096, FileOptions.Asynchronous);

            stream.Position = (long) chunkIndex * chunkSize;

            await data.CopyToAsync(stream, cancellationToken);
        }

        public Task CommitSavedChunks(int userId, Guid fileGuid, IEnumerable<int> chunkIndexes, string? fileContentType, CancellationToken cancellationToken = default)
        {
            //Locally saved files doesn't require any additional operation to persist the data

            return Task.CompletedTask;
        }

        public async Task GetChunk(int userId, Guid fileGuid, int chunkSize, int chunkIndex, Stream outputStream,
            CancellationToken cancellationToken = default)
        {
            var bufferSize = 4096;
            
            var filePath = Path.Combine(_settings.Value.OnPremiseFileLocation, userId.ToString(), fileGuid.ToString());
            
            await using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read,
                bufferSize, FileOptions.Asynchronous);

            stream.Position = chunkIndex * chunkSize;

            if (stream.Position + chunkSize > stream.Length)
            {
                chunkSize = (int) (stream.Length - stream.Position);
            }
            
            while (chunkSize > 0)
            {
                var buffer = new byte[bufferSize];
                var size = Math.Min(bufferSize, chunkSize);
                await stream.ReadAsync(buffer.AsMemory(0, size), cancellationToken);
                await outputStream.WriteAsync(buffer.AsMemory(0, size), cancellationToken);
                chunkSize -= bufferSize;
            }
        }

        public async Task GenerateNewFile(int userId, Guid fileGuid)
        {
            var filePath = Path.Combine(_settings.Value.OnPremiseFileLocation, userId.ToString());
            Directory.CreateDirectory(filePath);

            filePath = Path.Combine(filePath, fileGuid.ToString());

            await Create(filePath).DisposeAsync();
        }

        public Task DeleteExistingFile(int userId, Guid fileGuid)
        {
            var filePath = Path.Combine(_settings.Value.OnPremiseFileLocation, userId.ToString());
            if (!Directory.Exists(filePath)) return Task.CompletedTask;
            filePath = Path.Combine(filePath, fileGuid.ToString());
            Delete(filePath);
            
            return Task.CompletedTask;
        }
    }
}