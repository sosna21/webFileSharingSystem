using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface IFileService
    {
        Task<(Result<OperationResult>, IEnumerable<FilePathPart>?)> GetPathToFileAsync(int fileId, int userId,
            CancellationToken cancellationToken = default);

        Task<Result<OperationResult>> RenameFileAsync(int fileId, int userId, string newName,
            CancellationToken cancellationToken = default);

        Task<(Result<OperationResult>, File?)> CreateDirectoryAsync(int? parentId, int userId, string directoryName,
            CancellationToken cancellationToken = default);

        Task<Result<OperationResult>> DeleteFileAsync(int fileId, int userId,
            CancellationToken cancellationToken = default);

        Task<Result<OperationResult>> DeleteDirectoryAsync(int directoryFileId, int userId,
            CancellationToken cancellationToken = default);

        Task<Result<OperationResult>> MoveFilesAsync(int? newParentId, IEnumerable<int> fileIds, int userId,
            CancellationToken cancellationToken = default);

        Task<Result<OperationResult>> CopyFilesAsync(int? newParentId, IEnumerable<int> fileIds, int userId,
            CancellationToken cancellationToken = default);
    }
}