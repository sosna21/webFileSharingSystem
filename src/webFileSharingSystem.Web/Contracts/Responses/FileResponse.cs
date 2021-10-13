using System;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Web.Contracts.Responses
{
    public class FileResponse
    {
        public int Id { get; set; }
        public string FileName { get; set; } = null!;
        public string? MimeType { get; set; }
        public ulong Size { get; set; } 
        public bool IsFavourite { get; set;}
        public bool IsShared { get; set;}
        public bool IsDirectory { get; set; }
        public DateTime ModificationDate { get; set; }
        public FileStatus FileStatus { get; set; }
        public PartialFileInfo? PartialFileInfo { get; set; }
        public double? UploadProgress { get; set; }
    }
}