using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetSearchedFilesSpec : BaseSpecification<File>
    {
        public GetSearchedFilesSpec(int userId, string searchedPhrase) : base(
            e => e.UserId == userId
                && e.IsDeleted == false 
                && e.FileName.Contains(searchedPhrase))
        {
            AddInclude(file => file.PartialFileInfo);
            ApplyOrderBy(file => file.Id);
        }
    }
}