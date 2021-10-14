using System;

using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Core.Entities
{
    public class Share : AuditableEntity
    {
        public int SharedByUserId { get; set; }
        public int SharedWithUserId { get; set; }
        public int FileId { get; set; }
        public File File { get; set; } = null!;
        public ShareAccessMode AccessMode { get; set; }
        public TimeSpan AccessDuration { get; set; }
    }
}