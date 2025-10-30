using System;
using System.Threading;
using System.Threading.Tasks;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface IUserLocks
    {
        Task<IDisposable> AcquireAsync(int userId, CancellationToken cancellationToken = default);
        Task RemoveStaleLocksAsync(TimeSpan maxIdle);
    }
}
