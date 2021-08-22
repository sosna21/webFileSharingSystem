using System;

namespace API.DTOs {
    public class FileDto {
        public string Icon { get; set; }
        public string FileName { get; set; }
        public DateTime ModificationData { get; set; }
        public ulong Size { get; set; } 
        public bool IsFavourite { get; set;}
        public bool IsShared { get; set;}
    }
}