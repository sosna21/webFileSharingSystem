using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications;

public class FindActiveShareByIdSpecs : BaseSpecification<Share>
{
    public FindActiveShareByIdSpecs(int shareId)
        : base(s =>
            s.Id == shareId
            && s.RevokedAt == null)
    {
        AddInclude(s => s.SharedWithUser);
    }
}
