using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetSharedFilesSpec : BaseSpecification<SharedFileSqlRow>
    {
        public GetSharedFilesSpec(int? parentId, string? searchPhrase) : base(share =>
            string.IsNullOrEmpty(searchPhrase) || share.FileName.Contains(searchPhrase))
        {
            ApplyOrderBy(share => share.Id);
        }
    }
}