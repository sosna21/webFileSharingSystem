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

        Task<string> GenerateNewFile(int userId, Guid persistedFileId);

        Task GetFileStream(string filePath, Stream outputStream, CancellationToken cancellationToken = default);

        string GetFilePath(int userId, Guid fileGuid);

        void DeleteExistingFile(int userId, Guid persistedFileId);
    }
}