using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetFavouriteFilesSpecs : BaseSpecification<File>
    {
        public GetFavouriteFilesSpecs(int userId, int parentId) : base(
            file => file.UserId == userId
                 && file.IsDeleted == false
                 && file.IsFavourite == true
                 && parentId == -1 ? file.ParentId == null : file.ParentId == parentId)
        {
            ApplyOrderBy(file => file.Id);
        }
    }
}