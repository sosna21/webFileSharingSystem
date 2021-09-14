/*
 * Repository patter, source:
 * https://medium.com/@rudyzio92/net-core-using-the-specification-pattern-alongside-a-generic-repository-318cd4eea4aa
 */

using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.EntityFrameworkCore;

using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Infrastructure.Data;

namespace webFileSharingSystem.Infrastructure.Common
{
    public class Repository<TEntity> : IRepository<TEntity> where TEntity : BaseEntity
    {
        private readonly ApplicationDbContext _context;

        public Repository(ApplicationDbContext context)
        {
            _context = context;
        }
        
        //Queries
        public async Task<TEntity?> FindByIdAsync(int id, CancellationToken cancellationToken = default)
        {
            return await _context.Set<TEntity>().FindAsync(new object[]{ id }, cancellationToken);
        }

        public async Task<IEnumerable<TEntity>> FindAsync(ISpecification<TEntity>? specification = null, CancellationToken cancellationToken = default)
        {
            return await ApplySpecification(specification).ToListAsync(cancellationToken);
        }

        public async Task<PaginatedList<TEntity>> PaginatedListAsync(int pageNumber, int pageSize, ISpecification<TEntity>? specification = null, CancellationToken cancellationToken = default)
        {
            var querySource = ApplySpecification(specification);
            var count = await querySource.CountAsync(cancellationToken);
            var items = await querySource.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);

            return new PaginatedList<TEntity>(items, count, pageNumber, pageSize);
        }

        public async Task<bool> ContainsAsync(ISpecification<TEntity>? specification = null, CancellationToken cancellationToken = default)
        {
            return await CountAsync(specification, cancellationToken ) > 0;
        }
        
        public async Task<bool> ContainsAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default)
        {
            return await CountAsync(predicate, cancellationToken ) > 0;
        }

        public Task<int> CountAsync(ISpecification<TEntity>? specification = null, CancellationToken cancellationToken = default)
        {
            return ApplySpecification(specification).CountAsync(cancellationToken);
        }
        
        public Task<int> CountAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default)
        {
            return _context.Set<TEntity>().Where(predicate).CountAsync(cancellationToken);
        }
        

        // Commands
        public void Add(TEntity entity)
        {
            _context.Set<TEntity>().Add(entity);
        }

        public void AddRange(IEnumerable<TEntity> entities)
        {
            _context.Set<TEntity>().AddRange(entities);
        }

        public void Remove(TEntity entity)
        {
            _context.Set<TEntity>().Remove(entity);
        }

        public void RemoveRange(IEnumerable<TEntity> entities)
        {
            _context.Set<TEntity>().RemoveRange(entities);
        }

        public void Update(TEntity entity)
        {
            _context.Set<TEntity>().Attach(entity);
            _context.Entry(entity).State = EntityState.Modified;
        }

        private IQueryable<TEntity> ApplySpecification(ISpecification<TEntity>? spec)
        {
            return SpecificationEvaluator<TEntity>.GetQuery(_context.Set<TEntity>().AsQueryable(), spec);
        }
    }
}