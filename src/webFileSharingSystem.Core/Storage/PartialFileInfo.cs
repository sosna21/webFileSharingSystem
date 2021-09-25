using System;

namespace webFileSharingSystem.Core.Storage
{
    public struct PartialFileInfo
    { 
        public long FileSize { get; set; }
        
        public int ChunkSize { get; set; }
        /// <summary>
        /// Persistence map shall be initialized with ones when file is about to be uploaded.
        /// When chunk is uploaded corresponding bit in persistence map should be set from one to zero.
        /// When file is fully uploaded all bits should be set to zero.
        /// </summary>
        public byte[] PersistenceMap { get; set; }

        public int NumberOfChunks => (int)Math.Ceiling((double) FileSize / ChunkSize);

        public int LastChunkSize => FileSize % ChunkSize == 0 ? ChunkSize : (int)(FileSize % ChunkSize);
    }
}