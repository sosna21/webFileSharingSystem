using System.ComponentModel.DataAnnotations;

namespace webFileSharingSystem.Web.Contracts.Requests
{
    public class FileRequest
    {
        [Required]
        public int PageNumber { get; set; }
        
        [Required]
        public int PageSize { get; set; }

        public int? ParentId { get; set; }

        public string? SearchedPhrase { get; set; }
    }
}