using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetSharedFilesSpec : BaseSpecification<File>
    {
        public GetSharedFilesSpec(int? parentId, string? searchPhrase) : base(file =>
            string.IsNullOrEmpty(searchPhrase) ? file.ParentId == parentId : true
            && (string.IsNullOrEmpty(searchPhrase) || file.FileName.Contains(searchPhrase)))
        {
            ApplyOrderBy(file => file.Id);
        }
    }
}