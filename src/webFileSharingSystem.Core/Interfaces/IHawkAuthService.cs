namespace webFileSharingSystem.Core.Interfaces
{
    public interface IHawkAuthService
    {
        public string GenerateBewit(string host, string url, int userId);
    }
}