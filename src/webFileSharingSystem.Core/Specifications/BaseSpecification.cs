/*
 * Specification patter, source:
 * https://medium.com/@rudyzio92/net-core-using-the-specification-pattern-alongside-a-generic-repository-318cd4eea4aa
 */

using System;
using System.Collections.Generic;
using System.Linq.Expressions;

using webFileSharingSystem.Core.Interfaces;

namespace webFileSharingSystem.Core.Specifications
{

    public abstract class BaseSpecification<T> : BaseSpecification<T, T>, ISpecification<T>
    {
        protected BaseSpecification(Expression<Func<T, bool>> criteria): base( criteria ) { }
    }

    public abstract class BaseSpecification<T, TOut> : ISpecification<T, TOut>
    {
        protected BaseSpecification(Expression<Func<T, bool>> criteria)
        {
            Criteria = criteria;
        }

        public Expression<Func<T, bool>>? Criteria { get; }
        public List<Expression<Func<T, object>>> Includes { get; } = new();
        public List<string> IncludeStrings { get; } = new();
        public Expression<Func<T, object>>? OrderBy { get; private set; }
        public Expression<Func<T, object>>? OrderByDescending { get; private set; }
        public Expression<Func<T, object>>? GroupBy { get; private set; }

        public Expression<Func<object, IEnumerable<T>, TOut>>? GroupByResult { get; private set; }

        public int? Take { get; private set; }
        public int? Skip { get; private set; }

        protected virtual void AddInclude(Expression<Func<T, object>> includeExpression)
        {
            Includes.Add(includeExpression);
        }

        protected virtual void AddInclude(string includeString)
        {
            IncludeStrings.Add(includeString);
        }

        protected virtual void ApplySkip(int skip)
        {
            Skip = skip;
        }
        
        protected virtual void ApplyTake(int take)
        {
            Take = take;
        }

        protected virtual void ApplyOrderBy(Expression<Func<T, object>> orderByExpression)
        {
            OrderBy = orderByExpression;
        }

        protected virtual void ApplyOrderByDescending(Expression<Func<T, object>> orderByDescendingExpression)
        {
            OrderByDescending = orderByDescendingExpression;
        }

        protected virtual void ApplyGroupBy(Expression<Func<T, object>> groupByExpression, Expression<Func<object, IEnumerable<T>, TOut>> groupByResult)
        {
            GroupBy = groupByExpression;
            GroupByResult = groupByResult;
        }
    }
}