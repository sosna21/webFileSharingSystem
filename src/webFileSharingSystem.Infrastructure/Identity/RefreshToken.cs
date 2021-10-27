using System;
using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Infrastructure.Identity
{
    public class RefreshToken : BaseEntity
    {
        public string Token { get; set; } = null!;

        public string IdentityUserId { get; set; } = null!;

        public DateTime ValidUntil { get; set; }

        public DateTime Created { get; set; }

        public string CreatedByIp { get; set; } = null!;

        public DateTime? Revoked { get; set; }

        public string? RevokedByIp { get; set; }
    }
}