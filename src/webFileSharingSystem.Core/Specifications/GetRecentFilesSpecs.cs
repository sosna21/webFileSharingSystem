using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetRecentFilesSpecs : BaseSpecification<File>
    {
        public GetRecentFilesSpecs(int userId, string? searchPhrase) : base(
            file => file.UserId == userId
                    && file.IsDirectory == false
                    && (string.IsNullOrEmpty(searchPhrase) || file.FileName.Contains(searchPhrase)))
        {
            AddInclude(file => file.Creator);
            AddInclude(file => file.Shares);
            ApplyOrderByDescending(file => file.LastModified ?? file.Created);
            ApplyTake(30);
        }
    }
}