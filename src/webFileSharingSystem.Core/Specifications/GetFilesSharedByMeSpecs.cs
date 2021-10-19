using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetFilesSharedByMeSpecs : BaseSpecification<Share>
    {
        public GetFilesSharedByMeSpecs(int userId) : base(share => share.SharedByUserId == userId )
        {
            AddInclude(share => share.File);
            ApplyOrderBy(file => file.Id);
        }
    }
}