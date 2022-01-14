using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Core.Entities
{
    public class FileAccessMode : BaseEntity
    {
        public ShareAccessMode AccessMode { get; set; } 
    }
}