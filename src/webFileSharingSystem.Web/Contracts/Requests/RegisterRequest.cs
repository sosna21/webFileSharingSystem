using System.ComponentModel.DataAnnotations;

namespace webFileSharingSystem.Web.Contracts.Requests
{
    public class RegisterRequest
    {
        [Required]
        public string Username { get; set; } = null!;
        
        public string? Email { get; set; }

        [Required]
        public string Password { get; set; } = null!;
    }
}