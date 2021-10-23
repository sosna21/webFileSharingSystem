using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetAllFilesSpecs : BaseSpecification<File>
    {
        public GetAllFilesSpecs(int userId, int parentId, string? searchedPhrase) : base(
            e => e.UserId == userId
                && e.IsDeleted == false &&
                (parentId == -1 ? e.ParentId == null : e.ParentId == parentId)
                && (string.IsNullOrEmpty(searchedPhrase) || e.FileName.Contains(searchedPhrase)))
        {
            AddInclude(file => file.PartialFileInfo);
            ApplyOrderBy(file => file.Id);
        }
    }
}