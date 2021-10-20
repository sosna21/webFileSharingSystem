using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetFileByNameSpecs : BaseSpecification<File>
    {
        public GetFileByNameSpecs(int userId, int? parentId, string fileName) : base(
            file => file.UserId == userId
                    && file.ParentId == parentId
                    && file.FileName == fileName)
        {
        }
    }
}