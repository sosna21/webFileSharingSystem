using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetRecentFilesSpecs : BaseSpecification<File>
    {
        public GetRecentFilesSpecs(int userId, string? searchPhrase) : base(
            file => file.UserId == userId
                    && file.IsDeleted == false
                    && (string.IsNullOrEmpty(searchPhrase) || file.FileName.Contains(searchPhrase)))
        {
            ApplyOrderByDescending(file => file.LastModified ?? file.Created);
            ApplyTake(30);
        }
    }
}