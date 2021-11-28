using System;
using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Core.Entities
{
    public class SharedFile : BaseEntity
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int? ParentId { get; set; }
        public string FileName { get; set; } = null!;
        public string? MimeType { get; set; }
        public ulong Size { get; set; } 
        public bool IsFavourite { get; set;}
        public bool IsShared { get; set;}
        public bool IsDirectory { get; set; }
        public bool IsDeleted { get; set; }
        public Guid? FileId { get; set; }
        public FileStatus FileStatus { get; set; }
        public ShareAccessMode AccessMode { get; set; }
        public DateTime ValidUntil { get; set; }
        public string SharedUserName { get; set; } = null!;
    }
}