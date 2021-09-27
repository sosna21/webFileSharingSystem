using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetRecentFilesSpecs : BaseSpecification<File>
    {
        public GetRecentFilesSpecs(int userId) : base(
            file => file.UserId == userId
                    && file.IsDeleted == false)
        {
            ApplyOrderByDescending(file => file.LastModified ?? file.Created);
            ApplyTake(30);
        }
    }
}