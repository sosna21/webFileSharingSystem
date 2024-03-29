﻿/*
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
        
        public async Task<IEnumerable<TResult>> FindAsync<TResult>(ISpecification<TEntity, TResult> specification, CancellationToken cancellationToken = default)
        {
            if (specification.GroupBy is null || specification.GroupByResult is null)
                throw new InvalidOperationException("This method can be used only when grouping is applied");
            
            return await ApplySpecificationWithGroupBy(specification).ToListAsync(cancellationToken);
        }

        public async Task<PaginatedList<TResult>> PaginatedListFindAsync<TResult>(int pageNumber, int pageSize, Func<TEntity, TResult> mapToResult, ISpecification<TEntity>? specification = null, CancellationToken cancellationToken = default)
        {
            return await PaginatedListFindAsync(pageNumber, pageSize, mapToResult, ApplySpecification(specification),
                cancellationToken);
        }
        
        public async Task<PaginatedList<TResult>> PaginatedListFindAsync<TResult>(int pageNumber, int pageSize, Func<TEntity, TResult> mapToResult, IQueryable<TEntity> customQuery, CancellationToken cancellationToken = default)
        {
            var count = await customQuery.CountAsync(cancellationToken);
            var items = await customQuery.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);

            return new PaginatedList<TResult>(items.Select(mapToResult), count, pageNumber, pageSize);
        }

        public async Task<bool> ContainsAsync(ISpecification<TEntity>? specification = null, CancellationToken cancellationToken = default)
        {
            return await ApplySpecification(specification).AnyAsync(cancellationToken);
        }
        
        public async Task<bool> ContainsAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default)
        {
            return await _context.Set<TEntity>().AnyAsync(predicate, cancellationToken);
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
            return SpecificationEvaluator<TEntity, TEntity>.GetQuery(_context.Set<TEntity>().AsQueryable(), spec);
        }
        
        private IQueryable<TResult> ApplySpecificationWithGroupBy<TResult>(ISpecification<TEntity, TResult> spec)
        {
            return SpecificationEvaluator<TEntity, TResult>.GetGroupedQuery(_context.Set<TEntity>().AsQueryable(), spec);
        }
    }
}