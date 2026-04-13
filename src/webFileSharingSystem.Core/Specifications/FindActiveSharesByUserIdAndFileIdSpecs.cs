using System;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications;

public sealed class FindActiveSharesByUserIdAndFileIdSpecs : BaseSpecification<Share>
{
    public FindActiveSharesByUserIdAndFileIdSpecs(int userId, int fileId) 
        : base(s => 
            s.SharedByUserId == userId
            && s.FileId == fileId && s.RevokedAt == null
            && (s.ValidUntil == null || s.ValidUntil > DateTime.UtcNow))
    {
        AddInclude(s => s.SharedWithUser);
    }
}
