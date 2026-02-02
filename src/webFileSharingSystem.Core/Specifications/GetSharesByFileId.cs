using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications;

public sealed class GetSharesByFileId : BaseSpecification<Share>
{
    public GetSharesByFileId(int fileId) : base(
        share => share.FileId == fileId)
    {
        
    }
}
