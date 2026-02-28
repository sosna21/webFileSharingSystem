using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface IShareService
    {
        Task<(Result<OperationResult>, Share?)> AddShareAsync(int fileId, string userNameToShareWith, ShareAccessMode accessMode,
            DateTime? validUntil, int currentUserId, CancellationToken cancellationToken = default);

        Task<(Result<OperationResult>, Share? updatedShare)> UpdateShareAsync(int shareId, ShareAccessMode accessMode, DateTime? validUntil,
            int currentUserId, CancellationToken cancellationToken = default);

        Task<Result<OperationResult>> RemoveShareByFileIdAsync(int fileId, int userId, CancellationToken cancellationToken = default);

        Task<Result<OperationResult>> DeleteShareAsync(int shareId, int userId, CancellationToken cancellationToken = default);

        Task<(Result<OperationResult>, IEnumerable<Share>)> GetSharesForFileAsync(int fileId, int userId,
            CancellationToken cancellationToken = default);
    }
}
