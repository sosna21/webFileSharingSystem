using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public class GetShareByUserAndFileIdSpecs : BaseSpecification<Share>
    {
        public GetShareByUserAndFileIdSpecs(int userId, int fileId)
            : base(share => share.SharedByUserId == userId && share.FileId == fileId)
        { }
    }
}