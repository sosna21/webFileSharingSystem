using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class FindNonRevokedShareBySharedWithUserIdAndFileIdSpecs : BaseSpecification<Share>
    {
        public FindNonRevokedShareBySharedWithUserIdAndFileIdSpecs(int sharedWithUserId, int fileId)
            : base(s =>
                s.SharedWithUserId == sharedWithUserId
                && s.FileId == fileId
                && s.RevokedAt == null)
        {
        }
    }
}