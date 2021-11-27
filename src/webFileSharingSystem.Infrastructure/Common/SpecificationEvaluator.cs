/*
 * Specification patter, source:
 * https://medium.com/@rudyzio92/net-core-using-the-specification-pattern-alongside-a-generic-repository-318cd4eea4aa
 */

using System;
using System.Linq;
using System.Linq.Expressions;

using Microsoft.EntityFrameworkCore;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;

namespace webFileSharingSystem.Infrastructure.Common
{
    public static class SpecificationEvaluator<TEntity, TEntityResult> 
        where TEntity : BaseEntity
    {
        public static IQueryable<TEntity> GetQuery(IQueryable<TEntity> inputQuery,
            ISpecification<TEntity>? specification)
        {
            if (specification is null)
            {
                return inputQuery;
            }

            var query = GetQueryInternal(inputQuery, (ISpecification<TEntity, TEntityResult>)specification);

            query = ApplyRowsLimit(query, (ISpecification<TEntity, TEntityResult>)specification);

            return query;
        }

        public static IQueryable<TEntityResult> GetGroupedQuery(
            IQueryable<TEntity> inputQuery,
            ISpecification<TEntity, TEntityResult> specification)
        {
            if (specification.GroupBy is null) throw new InvalidOperationException($"{nameof(specification.GroupBy)} must be specified");
            if (specification.GroupByResult is null) throw new InvalidOperationException($"{nameof(specification.GroupByResult)} must be specified");
            
            var query = GetQueryInternal(inputQuery, specification);

            
            //Convert specification Group by expression return type to Func<TEntity, object>
            // That's necessary for entity framework to parse the query correctly
            
            var groupByConverted = Expression.Convert(specification.GroupBy.Body, typeof(object));
            var groupByExpression = Expression.Lambda<Func<TEntity, object>>(groupByConverted, specification.GroupBy.Parameters);

            var groupedQuery = query.GroupBy(groupByExpression, specification.GroupByResult);

            groupedQuery = ApplyRowsLimit(groupedQuery, specification);

            return groupedQuery;
        }
        
        private static IQueryable<TEntity> GetQueryInternal(IQueryable<TEntity> query, ISpecification<TEntity, TEntityResult>? specification)
        {

            // modify the IQueryable using the specification's criteria expression
            if (specification.Criteria is not null)
            {
                query = query.Where(specification.Criteria);
            }

            // Includes all expression-based includes
            query = specification.Includes.Aggregate(query,
                (current, include) => current.Include(include));

            // Include any string-based include statements
            query = specification.IncludeStrings.Aggregate(query,
                (current, include) => current.Include(include));

            // Apply ordering if expressions are set
            if (specification.OrderBy is not null)
            {
                query = query.OrderBy(specification.OrderBy);
            }
            else if (specification.OrderByDescending is not null)
            {
                query = query.OrderByDescending(specification.OrderByDescending);
            }

            return query;
        }
        
        private static IQueryable<T> ApplyRowsLimit<T>(IQueryable<T> query, ISpecification<TEntity, TEntityResult> specification)
        {
            if (specification.Skip is not null)
            {
                query = query.Skip(specification.Skip.Value);
            }

            if (specification.Take is not null)
            {
                query = query.Take(specification.Take.Value);
            }

            return query;
        }
    }
}