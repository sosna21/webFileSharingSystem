namespace webFileSharingSystem.Web.Contracts.Responses
{
    public class AppUserResponse
    {
        public int Id { get; set; }
        
        public string? UserName { get; set; }
        
        public string? EmailAddress { get; set; }
        
        public ulong UsedSpace { get; set; }
        
        public ulong Quota { get; set; }
        
        public string Token { get; set; } = null!;
    }
}