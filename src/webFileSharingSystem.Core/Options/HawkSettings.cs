namespace webFileSharingSystem.Core.Options
{
    public class HawkSettings
    {
        public const string Scheme = "Hawk";
        public string Secret { get; set; } = null!;
        public int ExpiryTimeInSeconds { get; set; }
    }
}