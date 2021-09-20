using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;

namespace webFileSharingSystem.Core.Entities
{
    public class File : AuditableEntity, IEntityWithUserId
    {
        public int UserId { get; set; }
        public string FileName { get; set; } = null!;
        public string? MimeType { get; set; }
        public ulong Size { get; set; } 
        public bool IsFavourite { get; set;}
        public bool IsShared { get; set;}
        public bool IsDirectory { get; set; }
        public bool IsDeleted { get; set; }
    }
}