using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetFavouriteFilesSpecs : BaseSpecification<File>
    {
        public GetFavouriteFilesSpecs(int userId, string? searchPhrase) : base(
            file => file.UserId == userId
                    && file.IsFavourite == true
                    && (string.IsNullOrEmpty(searchPhrase) || file.FileName.Contains(searchPhrase)))
        {
            ApplyOrderBy(file => file.Id);
        }
    }
}