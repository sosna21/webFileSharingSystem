using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class FindFileByIdIncludePartialFileInfoSpecs : BaseSpecification<File>
    {
        public FindFileByIdIncludePartialFileInfoSpecs(int id) : base(
            e => e.Id == id)
        {
            AddInclude(file => file.PartialFileInfo!);
        }
    }
}