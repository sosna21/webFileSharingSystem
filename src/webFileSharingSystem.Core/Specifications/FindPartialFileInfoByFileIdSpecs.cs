using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class FindPartialFileInfoByFileIdSpecs : BaseSpecification<PartialFileInfo>
    {
        public FindPartialFileInfoByFileIdSpecs(int fileId)
            : base(fileInfo => fileInfo.FileId == fileId)
        {
        }
    }
}