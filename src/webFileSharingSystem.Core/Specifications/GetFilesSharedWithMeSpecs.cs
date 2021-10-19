using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetFilesSharedWithMeSpecs : BaseSpecification<Share>
    {
        public GetFilesSharedWithMeSpecs(int userId) : base(share => share.SharedWithUserId == userId )
        {
            AddInclude(share => share.File);
            ApplyOrderBy(file => file.Id);
        }
    }
}