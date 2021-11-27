namespace webFileSharingSystem.Infrastructure.Identity
{
    internal class UserRefreshTokensCount
    {
        public string IdentityUserId { get; set; } = null!;

        public int Count { get; set; }
    }
}