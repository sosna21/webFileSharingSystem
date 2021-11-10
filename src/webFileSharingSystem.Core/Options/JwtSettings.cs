﻿namespace webFileSharingSystem.Core.Options
{
    public class JwtSettings
    {
        public string Secret { get; set; } = null!;
        public string Audience { get; set; } = null!;
        public string Issuer { get; set; } = null!;
        public int ExpiryTimeInSeconds { get; set; }
        public int RefreshTokenExpiryTimeInDays { get; set; }
    }
}