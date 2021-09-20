using System;
using System.Collections.Generic;

namespace webFileSharingSystem.Core.Entities.Common
{
    public class PaginatedList<T>
    {
        public IEnumerable<T> Items { get; }
        public int PageIndex { get; }
        public int TotalPages { get; }
        public int TotalCount { get; }

        public PaginatedList(IEnumerable<T> items, int count, int pageIndex, int pageSize)
        {
            PageIndex = pageIndex;
            TotalPages = (int) Math.Ceiling(count / (double) pageSize);
            TotalCount = count;
            Items = items;
        }
    }
}