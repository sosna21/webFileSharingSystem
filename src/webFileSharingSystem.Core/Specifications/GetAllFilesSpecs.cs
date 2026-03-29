using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetAllFilesSpecs : BaseSpecification<File>
    {
        public GetAllFilesSpecs(int userId, int? parentId) : base(
            e => e.UserId == userId
               && e.ParentId == parentId)
        {
            AddInclude(file => file.PartialFileInfo!);
            AddInclude(file => file.Creator);
            AddInclude(file => file.Shares);
            ApplyOrderBy(file => file.Id);
        }
    }
}