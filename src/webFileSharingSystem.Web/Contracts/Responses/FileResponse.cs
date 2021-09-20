using System;

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
    }
}