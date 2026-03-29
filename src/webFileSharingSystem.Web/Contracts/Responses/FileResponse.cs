using System;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Web.Contracts.Responses
{
    public class FileResponse
    {
        public int Id { get; set; }
        public int? ParentId { get; set; }
        public required string FileName { get; set; }
        public string? MimeType { get; set; }
        public ulong Size { get; set; } 
        public bool IsFavourite { get; set;}
        public bool IsShared { get; set;}
        public DateTime? SharedUntil { get; set; }
        public bool IsDirectory { get; set; }
        public DateTime ModificationDate { get; set; }
        public FileStatus FileStatus { get; set; }
        public PartialFileInfo? PartialFileInfo { get; set; }
        public double? UploadProgress { get; set; }
        public int CreatedBy { get; set; }
        public required string CreatedByUserName { get; set; }
        public string? CreatedByPhotoUrl { get; set; }
    }
}