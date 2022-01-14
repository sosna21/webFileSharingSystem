using System;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;

namespace webFileSharingSystem.Core.Entities
{
    public class File : AuditableEntity, IFileBaseEntity
    {
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
        public PartialFileInfo? PartialFileInfo { get; set; }
    }
}