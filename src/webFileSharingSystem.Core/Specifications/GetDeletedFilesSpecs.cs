using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetDeletedFilesSpecs : BaseSpecification<File>
    {
        public GetDeletedFilesSpecs(int userId, int parentId) : base(
            file => file.UserId == userId
                 && file.IsDeleted == true
                 && parentId == -1 ? file.ParentId == null : file.ParentId == parentId)
        {
            ApplyOrderBy(file => file.Id);
        }
    }
}