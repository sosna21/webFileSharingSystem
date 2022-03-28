using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface IFilePersistenceService
    {

        Task SaveChunk(int userId, Guid fileGuid, int chunkIndex, int chunkSize, Stream data,
            CancellationToken cancellationToken = default);

        public Task CommitSavedChunks(int userId, Guid fileGuid, IEnumerable<int> chunkIndexes, string? fileContentType, bool isFileCompleted,
            CancellationToken cancellationToken = default);

        Task GetChunk(int userId, Guid fileGuid, int chunkSize, int chunkIndex, Stream outputStream,
            CancellationToken cancellationToken = default);
        
        Task<Stream> GetFileStream(int userId, Guid fileGuid, CancellationToken cancellationToken = default);

        Task GenerateNewFile(int userId, Guid fileGuid);

        Task DeleteExistingFile(int userId, Guid fileGuid);
    }
}