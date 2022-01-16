using System;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface IFileBaseEntity : IEntityWithUserId
    {
        public int UserId { get; set; }
        public int? ParentId { get; set; }
        public string FileName { get; set; }
        public string? MimeType { get; set; }
        public ulong Size { get; set; }
        public bool IsDirectory { get; set; }
        public Guid? FileId { get; set; }
    }
}