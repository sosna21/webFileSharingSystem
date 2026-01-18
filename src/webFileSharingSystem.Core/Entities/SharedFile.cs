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
        public Guid? FileGuid { get; set; }
        public int FileCreatedBy { get; set; }
        
        //Only for files that user uploads to shared folder
        public FileStatus FileStatus { get; set; }
        public PartialFileInfo? PartialFileInfo { get; set; }
        
        public int? ShareId { get; set; }
        public ShareAccessMode AccessMode { get; set; }
        public DateTime? ValidUntil { get; set; }
        public string SharedUserName { get; set; } = null!;
        public bool IsInherited { get; set; }
    }
}