using System;
using System.ComponentModel.DataAnnotations;

namespace webFileSharingSystem.Web.Contracts.Requests
{
    public class UploadFileInfoRequest
    {
        [Required]
        public string FileName { get; set; } = null!;

        [Required]
        public string MimeType { get; set; } = null!;

        [Required]
        public long Size { get; set; }
        
        [Required]
        public DateTime LastModificationDate { get; set; }
    }
}