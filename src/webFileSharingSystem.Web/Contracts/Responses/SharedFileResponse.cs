using System;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Web.Contracts.Responses
{
    public class SharedFileResponse
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int? ParentId { get; set; }
        public string FileName { get; set; } = null!;
        public string? MimeType { get; set; }
        public ulong Size { get; set; }
        public bool IsDirectory { get; set; }
        public string SharedUserName { get; set; } = null!;
        public string? SharedUserPhotoUrl { get; set; }
        public ShareAccessMode AccessMode { get; set; }
        public DateTime? ValidUntil { get; set; }
        public int CreatedBy { get; set; }
        public required string CreatedByUserName { get; set; }
        public string? CreatedByPhotoUrl { get; set; }
        
        //Only for files that user uploads to shared folder
        public FileStatus FileStatus { get; set; }
        public PartialFileInfo? PartialFileInfo { get; set; }
        public double? UploadProgress { get; set; }
    }
}