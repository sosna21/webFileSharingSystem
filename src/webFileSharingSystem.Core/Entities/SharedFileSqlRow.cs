using System;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;

namespace webFileSharingSystem.Core.Entities;

public sealed class SharedFileSqlRow : BaseEntity, IFileBaseEntity
{
    public int UserId { get; set; }
    public int? ParentId { get; set; }
    public string FileName { get; set; } = null!;
    public string? MimeType { get; set; }
    public ulong Size { get; set; }
    public bool IsDirectory { get; set; }
    public Guid? FileGuid { get; set; }
    public int FileCreatedBy { get; set; }
    public FileStatus FileStatus { get; set; }
        
    public int? ShareId { get; set; }
    public ShareAccessMode AccessMode { get; set; }
    public DateTime? ValidUntil { get; set; }
    public string SharedUserName { get; set; } = null!;
    public bool IsInherited { get; set; }
    
    //Cannot return full PartialFileInfo due to
    //Doubled Id column
    public int? PartialFileInfoId { get; set; }
    public long? UploadFileSize { get; set; }
    public int? ChunkSize { get; set; }
    public byte[]? PersistenceMap { get; set; }
}
