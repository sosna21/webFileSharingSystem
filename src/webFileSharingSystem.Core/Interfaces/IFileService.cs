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

        Task<(Result<OperationResult> result, FileOperationContext? operationContext)> CreateDirectoryAsync(int? parentId, int userId, string directoryName,
            CancellationToken cancellationToken = default);
        
        Task<(Result<OperationResult> result, IEnumerable<FileOperationContext>? operationContext)> MoveFilesAsync(int? targetParentId,
            IEnumerable<int> fileIds, int userId,
            CancellationToken cancellationToken = default);

        Task<(Result<OperationResult> result, IEnumerable<FileOperationContext>? operationContext)> CopyFilesAsync(int? targetParentId, IEnumerable<int> fileIds, int userId,
            CancellationToken cancellationToken = default);
        
        Task<Result<OperationResult>> DeleteAsync(int fileId, int userId, CancellationToken cancellationToken = default);
    }
}