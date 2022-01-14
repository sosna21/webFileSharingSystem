using System.Collections.Generic;
using System.Linq;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class FindFilesByFileIdsSpecs : BaseSpecification<File>
    {
        public FindFilesByFileIdsSpecs(IEnumerable<int> fileIds) : base(
            e => fileIds.Contains( e.Id ))
        {
        }
    }
}