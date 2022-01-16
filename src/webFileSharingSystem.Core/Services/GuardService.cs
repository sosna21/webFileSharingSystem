using System.Threading;
using System.Threading.Tasks;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;

namespace webFileSharingSystem.Core.Services
{
    public class GuardService : IGuardService
    {
        private readonly IUnitOfWork _unitOfWork;

        public GuardService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<bool> UserCanPerform<T>(int userId, T entity, ShareAccessMode minimumAccessMode,
            CancellationToken cancellationToken = default)
            where T : BaseEntity, IEntityWithUserId
        {
            if (entity.UserId == userId) return true;

            var accessMode = await _unitOfWork.CustomQueriesRepository()
                .GetSharedFileAccessMode(entity.Id, userId, cancellationToken);
            if (accessMode is null) return false;

            return accessMode.AccessMode >= minimumAccessMode;
        }
    }
}