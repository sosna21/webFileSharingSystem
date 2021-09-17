/*
 * Repository patter, source:
 * https://medium.com/@rudyzio92/net-core-using-the-specification-pattern-alongside-a-generic-repository-318cd4eea4aa
 */

using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface IRepository<TEntity> where TEntity : class
    {
        //Queries
        Task<TEntity?> FindByIdAsync(int id, CancellationToken cancellationToken = default);

        Task<IEnumerable<TEntity>> FindAsync(ISpecification<TEntity>? specification = null, CancellationToken cancellationToken = default);
        
        Task<PaginatedList<TEntity>> PaginatedListAsync(int pageNumber, int pageSize, ISpecification<TEntity>? specification = null, CancellationToken cancellationToken = default);

        Task<bool> ContainsAsync(ISpecification<TEntity>? specification = null, CancellationToken cancellationToken = default);
        
        Task<bool> ContainsAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default);

        Task<int> CountAsync(ISpecification<TEntity>? specification = null, CancellationToken cancellationToken = default);

        Task<int> CountAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default);
        

        // Commands
        void Add(TEntity entity);
        
        void AddRange(IEnumerable<TEntity> entities);

        void Update(TEntity entity);

        void Remove(TEntity entity);

        void RemoveRange(IEnumerable<TEntity> entities);
    }
}