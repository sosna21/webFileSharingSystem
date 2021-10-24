using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetFilesSharedWithMeSpecs : BaseSpecification<Share>
    {
        public GetFilesSharedWithMeSpecs(int userId, string? searchPhrase) : base(share => 
            share.SharedWithUserId == userId 
            && (string.IsNullOrEmpty(searchPhrase) || share.File.FileName.Contains(searchPhrase)))
        {
            AddInclude(share => share.File);
            ApplyOrderBy(file => file.Id);
        }
    }
}