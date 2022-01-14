using System;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Web.Contracts.Responses
{
    public class SharedFileResponse
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int? ParentId { get; set; }
        public string FileName { get; set; }
        public string? MimeType { get; set; }
        public ulong Size { get; set; }
        public bool IsDirectory { get; set; }

        public int? ShareId { get; set; }
        public string SharedUserName { get; set; } = null!;
        public ShareAccessMode AccessMode { get; set; }
        public DateTime ValidUntil { get; set; }
    }
}