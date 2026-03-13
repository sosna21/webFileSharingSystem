using System.Linq;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications;

public class GetSharedByUserFilesSpec : BaseSpecification<Share, File>
{
    public GetSharedByUserFilesSpec(int userId, string? search)
        : base(s =>
            s.SharedByUserId == userId &&
            (string.IsNullOrEmpty(search) || s.File.FileName.Contains(search)))
    {
        AddInclude(s => s.File);
        AddInclude(s => s.File.Creator);
        ApplySelector(s => s.File);
        ApplyDistinct();
        ApplyOrderByDescending(s => s.File.Id);
    }
}