namespace webFileSharingSystem.Core.Options
{
    public class StorageSettings
    {
        public ulong UserDefaultQuota { get; set; }

        public string OnPremiseFileLocation { get; set; } = null!;

        public ChunkSizeConstraints ChunkSizeConstraints { get; set; } = null!;
    }
}