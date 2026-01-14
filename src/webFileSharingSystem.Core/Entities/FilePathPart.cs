using System;
using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Core.Entities
{
    public class FilePathPart : BaseEntity
    {
        public string FileName { get; set; } = null!;
        public int Level { get; set; }
        
        public ShareAccessMode? AccessMode { get; init; }
        public DateTime? ValidUntil { get; init; }
    }
}