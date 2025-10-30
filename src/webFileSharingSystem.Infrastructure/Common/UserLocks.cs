using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;
using webFileSharingSystem.Core.Interfaces;

namespace webFileSharingSystem.Infrastructure.Common
{
    public class UserLocks : IUserLocks
    {
        private readonly ConcurrentDictionary<int, LockEntry> _locks = new();

        public async Task<IDisposable> AcquireAsync(int userId, CancellationToken cancellationToken = default)
        {
            var entry = _locks.GetOrAdd(userId, _ => new LockEntry(new SemaphoreSlim(1, 1)));
            await entry.Semaphore.WaitAsync(cancellationToken).ConfigureAwait(false);
            entry.UpdateLastAccess();
            return new Releaser(_locks, userId, entry);
        }

        public Task RemoveStaleLocksAsync(TimeSpan maxIdle)
        {
            var now = DateTime.UtcNow;

            foreach (var kvp in _locks)
            {
                var userId = kvp.Key;
                var entry = kvp.Value;
                
                if (now - entry.LastAccessedUtc <= maxIdle)
                    continue;
                
                if (entry.Semaphore.CurrentCount != 1)
                    continue;

                if (_locks.TryRemove(userId, out var removed))
                {
                    try
                    {
                        removed.Semaphore.Dispose();
                    }
                    catch
                    {
                        // ignore disposal errors
                    }
                }
            }

            return Task.CompletedTask;
        }

        private sealed class Releaser : IDisposable
        {
            private readonly ConcurrentDictionary<int, LockEntry> _owner;
            private readonly int _userId;
            private LockEntry _entry;

            public Releaser(ConcurrentDictionary<int, LockEntry> owner, int userId, LockEntry entry)
            {
                _owner = owner;
                _userId = userId;
                _entry = entry;
            }

            public void Dispose()
            {
                try
                {
                    _entry.Semaphore.Release();
                }
                catch
                {
                    // ignore release errors
                }

                // update last access time on release
                _entry.UpdateLastAccess();
                
                if (_entry.Semaphore.CurrentCount == 1)
                {
                    _owner.TryRemove(_userId, out _);
                }

                _entry = null!;
            }
        }

        private sealed class LockEntry
        {
            public LockEntry(SemaphoreSlim semaphore)
            {
                Semaphore = semaphore;
                LastAccessedUtc = DateTime.UtcNow;
            }

            public SemaphoreSlim Semaphore { get; }
            public DateTime LastAccessedUtc { get; private set; }

            public void UpdateLastAccess()
            {
                LastAccessedUtc = DateTime.UtcNow;
            }
        }
    }
}
