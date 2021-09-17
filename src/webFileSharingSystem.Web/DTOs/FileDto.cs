using System;

namespace webFileSharingSystem.Web.DTOs {
    public class FileDto {
        public int Id { get; set; }
        public string FileName { get; set; }
        public DateTime ModificationData { get; set; }
        public ulong Size { get; set; } 
        public bool IsFavourite { get; set;}
        public bool IsShared { get; set;}
        public bool IsDirectory { get; set; }
    }
}