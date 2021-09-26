using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public class FindPartialFileInfoByFileIdSpecs : BaseSpecification<PartialFileInfo>
    {
        public FindPartialFileInfoByFileIdSpecs(int fileId)
            : base(fileInfo => fileInfo.FileId == fileId)
        {
        }
    }
}