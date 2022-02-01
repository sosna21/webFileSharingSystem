using System.Linq;
using webFileSharingSystem.Core.Storage;
using Xunit;

namespace webFileSharingSystem.UnitTests.Storage
{
    public class PartialFile
    {
        [Fact]
        public void PartialFileInfoIsGenerated()
        {
            var fileSizeInBytes = 1024L * 1024; // 1MB
            var preferredChunkSize = 512 * 1024; //0.5MB

            var partialFileInfo = StorageExtensions.GeneratePartialFileInfo(fileSizeInBytes, preferredChunkSize);
            
            Assert.Equal( fileSizeInBytes, partialFileInfo.FileSize );
            Assert.Equal( preferredChunkSize, partialFileInfo.ChunkSize );
            Assert.Equal(2, partialFileInfo.NumberOfChunks);
            Assert.Equal( preferredChunkSize, partialFileInfo.LastChunkSize);

            byte[] expectedPersistenceMap = { 0xC0 };
            
            Assert.Equal( expectedPersistenceMap, partialFileInfo.PersistenceMap);
        }

        [Fact]
        public void FullyOccupiedFileInfoIsGenerated()
        {
            var fileSizeInBytes = 8 * 1024L * 1024; // 8MB
            var preferredChunkSize = 512 * 1024; //0.5MB

            var partialFileInfo = StorageExtensions.GeneratePartialFileInfo(fileSizeInBytes, preferredChunkSize);
            
            Assert.Equal( fileSizeInBytes, partialFileInfo.FileSize );
            Assert.Equal( preferredChunkSize, partialFileInfo.ChunkSize );
            Assert.Equal(16, partialFileInfo.NumberOfChunks);
            Assert.Equal( preferredChunkSize, partialFileInfo.LastChunkSize);

            byte[] expectedPersistenceMap = { 0xFF, 0xFF };
            
            Assert.Equal( expectedPersistenceMap, partialFileInfo.PersistenceMap);

            var ones = partialFileInfo.PersistenceMap.GetAllIndexesWithValue(true, 0, 15);
            
            Assert.Equal( ones, Enumerable.Range(0, 16) );
        }
    }
}