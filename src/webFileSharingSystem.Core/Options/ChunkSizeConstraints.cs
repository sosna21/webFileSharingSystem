namespace webFileSharingSystem.Core.Options
{
    public class ChunkSizeConstraints
    {
        public int MinimumChunkSize { get; set; }
        public int MaximumChunkSize { get; set; }
        public int PreferredNumberOfChunks { get; set; }
    }
}