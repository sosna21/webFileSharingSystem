using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetAllFilesSpecs : BaseSpecification<File>
    {
        public GetAllFilesSpecs(int userId) : base(
            e => e.UserId == userId
                 && e.IsDeleted == false)
        {
        }
    }
}