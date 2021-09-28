using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class FindFileByIdIncludePartialFileInfo : BaseSpecification<File>
    {
        public FindFileByIdIncludePartialFileInfo(int id) : base(
            e => e.Id == id)
        {
            AddInclude(file => file.PartialFileInfo);
        }
    }
}