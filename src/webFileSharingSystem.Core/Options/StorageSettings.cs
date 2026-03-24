namespace webFileSharingSystem.Core.Options
{
    public class StorageSettings
    {
        public ulong UserDefaultQuota { get; set; }

        public string OnPremiseFileLocation { get; set; } = null!;

        public string ProfilePhotoSubdirectory { get; set; } = "photos";

        public long ProfilePhotoMaxSizeBytes { get; set; }

        public ChunkSizeConstraints ChunkSizeConstraints { get; set; } = null!;
    }
}