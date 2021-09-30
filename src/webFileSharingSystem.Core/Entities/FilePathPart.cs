using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Core.Entities
{
    public class FilePathPart : BaseEntity
    {
        public string FileName { get; set; } = null!;
    }
}