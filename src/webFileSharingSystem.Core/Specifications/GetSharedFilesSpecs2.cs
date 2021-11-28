using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetSharedFilesSpec2<TEntity> : BaseSpecification<TEntity> where TEntity : SharedFile
    {
        public GetSharedFilesSpec2(int? parentId, string? searchPhrase) : base(file =>
            string.IsNullOrEmpty(searchPhrase) ? file.ParentId == parentId : true
            && (string.IsNullOrEmpty(searchPhrase) || file.FileName.Contains(searchPhrase)))
        {
            ApplyOrderBy(file => file.Id);
        }
    }
}