﻿using System.ComponentModel.DataAnnotations;

namespace webFileSharingSystem.Web.Contracts.Requests
{
    public class RefreshTokenRequest
    {
        [Required]
        public string Token { get; set; } = null!;
        
        public string? RefreshToken { get; set; }
    }
}