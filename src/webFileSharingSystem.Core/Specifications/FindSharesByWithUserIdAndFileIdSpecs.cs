using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class FindSharesByWithUserIdAndFileIdSpecs : BaseSpecification<Share>
    {
        public FindSharesByWithUserIdAndFileIdSpecs(int userId, int fileId) : base(
            share => share.SharedWithUserId == userId
                    && share.FileId == fileId)
        {
        }
    }
}