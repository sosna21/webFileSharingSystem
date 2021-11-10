namespace webFileSharingSystem.Web.Contracts.Responses
{
    public class TokenResponse
    {
        public string Token { get; set; } = null!;
        
        public string RefreshToken { get; set; } = null!;
    }
}