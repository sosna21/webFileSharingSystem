using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class FindSharesByUserIdAndFileId : BaseSpecification<Share>
    {
        public FindSharesByUserIdAndFileId(int userId, int fileId) : base(
            share => share.SharedByUserId == userId
                    && share.FileId == fileId)
        {
            AddInclude(share => share.SharedWithUserId);
            ApplyOrderBy(share => share.SharedWithUserId);
        }
    }
}