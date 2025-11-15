using System.IO;
using System.Threading;
using System.Threading.Tasks;
using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface IDownloadService
    {
        Task<(Result<OperationResult> Result, DownloadActionType Action, string Token)> PrepareDownloadAsync(
            int[] fileIds, int userId, CancellationToken cancellationToken = default);

        Task<(Result<OperationResult> Result, DownloadedFile? File)> GetSingleFileAsync(
            string token, int userId, CancellationToken cancellationToken = default);

        Task<Result<OperationResult>> WriteArchiveToAsync(
            string token, int userId, Stream output, CancellationToken cancellationToken = default);
    }
}
