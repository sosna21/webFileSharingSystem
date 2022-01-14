using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetSharedFilesSpec<TEntity> : BaseSpecification<TEntity> where TEntity : BaseEntity, IFileBaseEntity
    {
        public GetSharedFilesSpec(int? parentId, string? searchPhrase) : base(share =>
            string.IsNullOrEmpty(searchPhrase) ? share.ParentId == parentId : true
            && (string.IsNullOrEmpty(searchPhrase) || share.FileName.Contains(searchPhrase)))
        {
            ApplyOrderBy(share => share.Id);
        }
    }
}