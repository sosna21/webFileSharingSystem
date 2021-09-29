using System;
using System.ComponentModel.DataAnnotations;

namespace webFileSharingSystem.Web.Contracts.Requests
{
    public class UploadFileInfoRequest
    {
        [Required]
        public string FileName { get; set; } = null!;
        
        [Required]
        public long Size { get; set; }
        
        [Required]
        public DateTime LastModificationDate { get; set; }
        
        public string? MimeType { get; set; }

        public int? ParentId { get; set; }
    }
}