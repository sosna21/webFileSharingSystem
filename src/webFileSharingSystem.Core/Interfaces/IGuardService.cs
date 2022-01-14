using System.Threading;
using System.Threading.Tasks;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Core.Interfaces;

public interface IGuardService
{
    Task<bool> UserCanPerform<T>(int userId, T entity, ShareAccessMode minimumAccessMode, CancellationToken cancellationToken = default)
        where T : BaseEntity, IEntityWithUserId;
}