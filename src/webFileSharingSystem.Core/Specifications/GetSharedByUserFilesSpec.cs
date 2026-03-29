using System;
using System.Linq;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications;

public sealed class GetSharedByUserFilesSpec : BaseSpecification<Share, File>
{
    public GetSharedByUserFilesSpec(int userId, string? search)
        : base(s =>
            s.SharedByUserId == userId &&
            s.RevokedAt == null &&
            (s.ValidUntil == null || s.ValidUntil > DateTime.UtcNow) &&
            (string.IsNullOrEmpty(search) || s.File.FileName.Contains(search)))
    {
        AddInclude(s => s.File);
        AddInclude(s => s.File.Creator);
        AddInclude(s => s.File.Shares);
        ApplySelector(s => s.File);
        ApplyDistinct();
        ApplyOrderByDescending(s => s.File.Id);
    }
}