﻿using System.ComponentModel.DataAnnotations;

namespace webFileSharingSystem.Web.Contracts.Requests
{
    public class LoginRequest
    {
        [Required]
        public string Username { get; set; } = null!;

        [Required]
        public string Password { get; set; } = null!;
    }
}