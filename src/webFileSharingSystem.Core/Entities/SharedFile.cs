using System;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;

namespace webFileSharingSystem.Core.Entities
{
    public class SharedFile : BaseEntity, IFileBaseEntity
    {
        public int UserId { get; set; }
        public int? ParentId { get; set; }
        public string FileName { get; set; } = null!;
        public string? MimeType { get; set; }
        public ulong Size { get; set; }
        public bool IsDirectory { get; set; }
        public Guid? FileId { get; set; }
        
        public int? ShareId { get; set; }
        public ShareAccessMode AccessMode { get; set; }
        public DateTime ValidUntil { get; set; }
        public string SharedUserName { get; set; } = null!;
    }
}