using System;
using System.Collections.Concurrent;
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

        private static readonly ConcurrentDictionary<Guid, Lazy<SemaphoreSlim>> LockSemaphores = new();

        public LocalFilePersistenceService(IOptions<StorageSettings> settings)
        {
            _settings = settings;
            Directory.CreateDirectory(_settings.Value.OnPremiseFileLocation);
        }

        public async Task<Stream> GetFileStream(int userId, Guid fileGuid,
            CancellationToken cancellationToken = default)
        {
            var filePath = Path.Combine(_settings.Value.OnPremiseFileLocation, fileGuid.ToString());
            return await new ValueTask<Stream>(new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read,
                4096, FileOptions.Asynchronous));
        }

        public async Task SaveChunk(int userId, Guid fileGuid, int chunkIndex, int chunkSize, Stream data,
            CancellationToken cancellationToken = default)
        {
            var filePath = Path.Combine(_settings.Value.OnPremiseFileLocation, fileGuid.ToString());

            var semaphore = LockSemaphores.GetOrAdd(fileGuid, _ => new Lazy<SemaphoreSlim>(() => new SemaphoreSlim(1, 1))).Value;
            await semaphore.WaitAsync(cancellationToken);
            try
            {
                await using var stream = new FileStream(
                    filePath,
                    FileMode.OpenOrCreate,
                    FileAccess.Write,
                    FileShare.Write,
                    4096,
                    FileOptions.Asynchronous);

                stream.Position = (long)chunkIndex * chunkSize;

                await data.CopyToAsync(stream, cancellationToken);
            } finally
            {
                semaphore.Release();
            }
        }

        public Task CommitSavedChunks(int userId, Guid fileGuid, IEnumerable<int> chunkIndexes, string? fileContentType, bool isFileCompleted,
            CancellationToken cancellationToken = default)
        {
            if (isFileCompleted) LockSemaphores.TryRemove(fileGuid, out _);

            //Locally saved files doesn't require any additional operation to persist the data
            
            return Task.CompletedTask;
        }

        public async Task GetChunk(int userId, Guid fileGuid, int chunkSize, int chunkIndex, Stream outputStream,
            CancellationToken cancellationToken = default)
        {
            var bufferSize = 4096;

            var filePath = Path.Combine(_settings.Value.OnPremiseFileLocation, fileGuid.ToString());

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
            Directory.CreateDirectory(_settings.Value.OnPremiseFileLocation);
            var filePath = Path.Combine(_settings.Value.OnPremiseFileLocation, fileGuid.ToString());
            await Create(filePath).DisposeAsync();
        }

        public Task DeleteExistingFile(int userId, Guid fileGuid)
        {
            if(!Directory.Exists(_settings.Value.OnPremiseFileLocation)) return Task.CompletedTask;
            var filePath = Path.Combine(_settings.Value.OnPremiseFileLocation, fileGuid.ToString());
            Delete(filePath);
            return Task.CompletedTask;
        }
    }
}