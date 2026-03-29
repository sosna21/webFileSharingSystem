using System;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class FindActiveSharesBySharedWithUserIdAndFileIdSpecs : BaseSpecification<Share>
    {
        public FindActiveSharesBySharedWithUserIdAndFileIdSpecs(int sharedWithUserId, int fileId) 
            : base(s => 
                s.SharedWithUserId == sharedWithUserId
                && s.FileId == fileId && s.RevokedAt == null
                && (s.ValidUntil == null || s.ValidUntil > DateTime.UtcNow))
        {
            AddInclude(s => s.SharedWithUser);
        }
    }
}