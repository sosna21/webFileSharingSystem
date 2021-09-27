using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GeFilesNamesSpecs : BaseSpecification<File>
    {
        public GeFilesNamesSpecs(int userId, int? parentId) : base(
            file => file.UserId == userId
                    && file.ParentId == parentId)
        {
            ApplyOrderBy(file => file.Id);
        }
    }
}