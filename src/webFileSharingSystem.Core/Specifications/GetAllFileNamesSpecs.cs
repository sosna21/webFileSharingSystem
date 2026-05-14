using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications;

public sealed class GetAllFileNamesSpecs : BaseSpecification<File, string>
{
    public GetAllFileNamesSpecs(int? parentId) : base(
        e => e.ParentId == parentId)
    {
        ApplySelector(file => file.FileName);
    }
}
