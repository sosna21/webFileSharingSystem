using System;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class FindFileByFileGuidSpecs : BaseSpecification<File>
    {
        public FindFileByFileGuidSpecs(Guid fileGuid) : base(
            e => e.FileGuid.Value == fileGuid)
        {
        }
    }
}