using System;
using System.Collections.Generic;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;

namespace webFileSharingSystem.Core.Entities
{
    public class File : AuditableEntity, IFileBaseEntity
    {
        public int UserId { get; set; }
        public int? ParentId { get; set; }
        public virtual File? Parent { get; set; }
        public virtual ICollection<File> Children { get; set; } = new List<File>();
        public string FileName { get; set; } = null!;
        public string? MimeType { get; set; }
        public ulong Size { get; set; } 
        public bool IsFavourite { get; set;}
        public bool IsShared { get; set;}
        public bool IsDirectory { get; set; }
        public Guid? FileGuid { get; set; }
        public FileStatus FileStatus { get; set; }
        public PartialFileInfo? PartialFileInfo { get; set; }
    }
}