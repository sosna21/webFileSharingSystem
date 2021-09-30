/*
 * Unit Of Work patter, source:
 * https://medium.com/@rudyzio92/net-core-using-the-specification-pattern-alongside-a-generic-repository-318cd4eea4aa
 */

using System.Threading;
using System.Threading.Tasks;

using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface IUnitOfWork
    {
        ICustomQueriesRepository CustomQueriesRepository();
        
        IRepository<TEntity> Repository<TEntity>() where TEntity : BaseEntity;
        
        Task<int> Complete(CancellationToken cancellationToken = default);
    }
}