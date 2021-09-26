using System;
using System.Collections.Concurrent;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Options;

namespace webFileSharingSystem.Infrastructure.Storage.OnPremise
{
    public class FilePersistenceService : IFilePersistenceService
    {
        private readonly IOptions<StorageSettings> _settings;

        private readonly ConcurrentDictionary<int, string> _filePathsCache;

        public FilePersistenceService(IOptions<StorageSettings> settings)
        {
            _settings = settings;
            _filePathsCache = new ConcurrentDictionary<int, string>();
        }

        public async Task SaveChunk(string filePath, int chunkIndex, int chunkSize, byte[] data,
            CancellationToken cancellationToken = default)
        {
            async void PersistToStreamAction(Stream s) => await s.WriteAsync(data, cancellationToken);;

            await SaveChunk(filePath, chunkIndex, chunkSize, PersistToStreamAction);
        }
        
        // TODO If that version can be used to upload data add tests and use instead
        public async Task SaveChunk(string filePath, int chunkIndex, int chunkSize, Stream data,
            CancellationToken cancellationToken = default)
        {
            async void PersistToStreamAction(Stream s) => await data.CopyToAsync(s, cancellationToken);

            await SaveChunk(filePath, chunkIndex, chunkSize, PersistToStreamAction);
        }
        
        private async Task SaveChunk(string filePath, int chunkIndex, int chunkSize, Action<Stream> persistToStreamAction)
        {
            await using var stream = new FileStream(filePath, FileMode.OpenOrCreate, FileAccess.Write,
                FileShare.ReadWrite,
                4096, FileOptions.Asynchronous);

            stream.Position = chunkIndex * chunkSize;
            
            persistToStreamAction(stream);
        }

        public async Task<byte[]> GetChunk(string filePath, int chunkSize, int chunkIndex,
            CancellationToken cancellationToken = default)
        {
            await using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite,
                4096, FileOptions.Asynchronous);

            stream.Position = chunkIndex * chunkSize;

            if (stream.Position + chunkSize > stream.Length)
            {
                chunkSize = (int) (stream.Length - stream.Position);
            }

            var buffer = new byte[chunkSize];
            await stream.ReadAsync(buffer, cancellationToken);

            return buffer;
        }

        public string GenerateAndCacheFilePath(int userId, int fileId, Guid persistedFileId)
        {
            if (_filePathsCache.ContainsKey(fileId))
            {
                return _filePathsCache[fileId];
            }
            var filePath = Path.Combine(_settings.Value.OnPremiseFileLocation, userId.ToString());
            Directory.CreateDirectory(filePath);
            _filePathsCache[fileId] = Path.Combine(filePath, persistedFileId.ToString());
            return _filePathsCache[fileId];
        }

        public string? GetCachedFilePath(int fileId)
        {
            return _filePathsCache.ContainsKey(fileId) ? _filePathsCache[fileId] : null;
        }
    }
}