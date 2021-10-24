using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetFilesSharedByMeSpecs : BaseSpecification<Share>
    {
        public GetFilesSharedByMeSpecs(int userId, string? searchPhrase) : base(share => 
            share.SharedByUserId == userId
            && (string.IsNullOrEmpty(searchPhrase) || share.File.FileName.Contains(searchPhrase)))
        {
            AddInclude(share => share.File);
            ApplyOrderBy(file => file.Id);
        }
    }
}