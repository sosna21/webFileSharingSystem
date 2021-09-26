using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface IFilePersistenceService
    {
        Task SaveChunk(string filePath, int chunkIndex, int chunkSize, byte[] data,
            CancellationToken cancellationToken = default);
        
        Task SaveChunk(string filePath, int chunkIndex, int chunkSize, Stream data,
            CancellationToken cancellationToken = default);

        Task<byte[]> GetChunk(string filePath, int chunkSize, int chunkIndex,
            CancellationToken cancellationToken = default);

        string GenerateAndCacheFilePath(int userId, int fileId, Guid persistedFileId);
        
        string? GetCachedFilePath(int fileId );
    }
}