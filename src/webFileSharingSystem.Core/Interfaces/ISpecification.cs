/*
 * Specification patter, source:
 * https://medium.com/@rudyzio92/net-core-using-the-specification-pattern-alongside-a-generic-repository-318cd4eea4aa
 */

using System;
using System.Collections.Generic;
using System.Linq.Expressions;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface ISpecification<T> 
    {
        
        Expression<Func<T, bool>>? Criteria { get; }
        
        List<Expression<Func<T, object>>> Includes { get; }
        
        List<string> IncludeStrings { get; }
        
        Expression<Func<T, object>>? OrderBy { get; }
        
        Expression<Func<T, object>>? OrderByDescending { get; }
        
        Expression<Func<T, object>>? GroupBy { get; }

        int? Take { get; }
        
        int? Skip { get; }
    }
}