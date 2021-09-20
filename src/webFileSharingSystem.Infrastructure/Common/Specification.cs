using System;
using System.Linq.Expressions;
using webFileSharingSystem.Core.Specifications;

namespace webFileSharingSystem.Infrastructure.Common
{
    internal class Specification<T> : BaseSpecification<T>
    {
        public Specification(Expression<Func<T, bool>> criteria) : base(criteria)
        {
        }
    }
}