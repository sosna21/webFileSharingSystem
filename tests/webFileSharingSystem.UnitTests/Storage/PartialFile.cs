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
    }
}