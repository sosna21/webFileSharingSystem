using System;
using System.Collections.Generic;
using System.Linq;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class CountFilesByFileGuidsSpecs : BaseSpecification<File, FileGuidFilesCount>
    {
        public CountFilesByFileGuidsSpecs(IEnumerable<Guid> fileGuids) : base(
            e => fileGuids.Contains(e.FileId.Value))
        {
            ApplyGroupBy(g => g.FileId,
                (fileGuid, files) => new FileGuidFilesCount {FileGuid = (Guid) fileGuid, Count = files.Count()});
        }
    }
}