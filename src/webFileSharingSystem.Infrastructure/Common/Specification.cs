using System;
using System.Linq.Expressions;

namespace webFileSharingSystem.Infrastructure.Common
{
    internal class Specification<T> : BaseSpecification<T>
    {
        public Specification(Expression<Func<T, bool>> criteria) : base(criteria)
        {
        }
    }
}