using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using webFileSharingSystem.Core.Interfaces;

namespace webFileSharingSystem.Infrastructure.Common
{
    /// <summary>
    /// Periodically asks IUserLocks to remove stale locks to prevent unbounded growth.
    /// Registered in Infrastructure DI as a hosted service.
    /// </summary>
    public class UserLocksCleanupService : BackgroundService
    {
        private readonly IUserLocks _userLocks;
        private readonly TimeSpan _maxIdle;
        private readonly TimeSpan _period;

        public UserLocksCleanupService(IUserLocks userLocks)
        {
            _userLocks = userLocks;
            _maxIdle = TimeSpan.FromMinutes(30);
            _period = TimeSpan.FromMinutes(5);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await _userLocks.RemoveStaleLocksAsync(_maxIdle).ConfigureAwait(false);
                }
                catch
                {
                    // ignore - keep worker alive;
                }

                await Task.Delay(_period, stoppingToken).ConfigureAwait(false);
            }
        }
    }
}
