using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class FindSharesWithByUserIdAndFileId : BaseSpecification<Share>
    {
        public FindSharesWithByUserIdAndFileId(int userId, int fileId) : base(
            share => share.SharedWithUserId == userId
                    && share.FileId == fileId)
        {
            // AddInclude(share => share.SharedWithUserId);
            // ApplyOrderBy(share => share.SharedWithUserId);
        }
    }
}