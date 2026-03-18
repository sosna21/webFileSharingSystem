using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications;

public sealed class GetActiveNonUserUploadsSpecs: BaseSpecification<File>
{
    public GetActiveNonUserUploadsSpecs(int userId, int? parentId) : base(
        file => file.UserId == userId && file.ParentId == parentId && file.CreatedBy != userId
                )
    {
        AddInclude(file => file.PartialFileInfo!);
    }
}