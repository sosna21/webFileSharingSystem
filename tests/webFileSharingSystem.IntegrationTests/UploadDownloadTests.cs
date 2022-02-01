using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using webFileSharingSystem.Core.Options;
using webFileSharingSystem.Core.Storage;
using webFileSharingSystem.Infrastructure.Storage;
using Xunit;

namespace webFileSharingSystem.IntegrationTests
{
    public class UploadDownloadTests
    {
        private const string TestFilePath = "./Resources/testFile4kPhoto.jpg";
        private const string OnPremiseFileLocation = "./TestResources";
        private const int UserId = 1;
        private readonly Guid _testFileGuid = Guid.NewGuid();
        
        private readonly Random _random = new();

        private readonly LocalFilePersistenceService _filePersistenceService = new(
            Options.Create(new StorageSettings
        {
            UserDefaultQuota = 0,
            OnPremiseFileLocation = OnPremiseFileLocation
        }));

        public UploadDownloadTests()
        {
            Directory.CreateDirectory(OnPremiseFileLocation);
            
            var testFilePath = Path.Combine(OnPremiseFileLocation, _testFileGuid.ToString());
            File.Copy(TestFilePath, testFilePath);
        }

        ~UploadDownloadTests()
        {
            Directory.Delete(OnPremiseFileLocation, true);
        }
        
        [Fact]
        public async Task GetChunks()
        {
            
            var fileInfo = new FileInfo(TestFilePath);

            var fileSizeInBytes = fileInfo.Length; // 1MB
            var chunkSize = 512 * 1024; //0.5MB

            var partialFileInfo = StorageExtensions.GeneratePartialFileInfo(fileSizeInBytes, chunkSize);

            chunkSize = partialFileInfo.ChunkSize;

            var totalFileSizeFromChunks = 0L;
            for (var i = 0; i < partialFileInfo.NumberOfChunks; i++)
            {
                var outputStream = new MemoryStream();
                await _filePersistenceService.GetChunk(UserId, _testFileGuid, chunkSize, i, outputStream);
                Assert.True(outputStream.Length > 0);
                var expectedChunkSize = i < partialFileInfo.NumberOfChunks - 1
                    ? partialFileInfo.ChunkSize
                    : partialFileInfo.LastChunkSize;
                Assert.Equal(expectedChunkSize, outputStream.Length);
                totalFileSizeFromChunks += outputStream.Length;
            }

            Assert.Equal(fileSizeInBytes, totalFileSizeFromChunks);
        }

        [Fact]
        public async Task SaveChunks()
        {
            var newFileGuid = Guid.NewGuid();

            var savedFilePath = Path.Combine(OnPremiseFileLocation, newFileGuid.ToString());

            var fileInfo = new FileInfo(TestFilePath);
            var fileSizeInBytes = fileInfo.Length;
            var chunkSize = 512 * 1024; //0.5MB

            var chunks = await GetFileChunks(UserId, _testFileGuid, fileSizeInBytes, chunkSize);

            var totalFileSizeFromChunks = 0;

            foreach (var (index, chunk) in chunks.Select((c, index) => (Index: index, Chunk: c))
                .OrderBy(_ => _random.Next()))
            {
                var dataStream = new MemoryStream(chunk);
                await _filePersistenceService.SaveChunk(UserId, newFileGuid, index, chunkSize, dataStream);
                totalFileSizeFromChunks += chunks[index].Length;
            }


            Assert.Equal(fileSizeInBytes, totalFileSizeFromChunks);

            Assert.True(
                (await File.ReadAllBytesAsync(TestFilePath)).SequenceEqual(
                    await File.ReadAllBytesAsync(savedFilePath)));
        }

        private async Task<byte[][]> GetFileChunks(int userId, Guid fileGuid, long fileSizeInBytes, int chunkSize)
        {
            var partialFileInfo = StorageExtensions.GeneratePartialFileInfo(fileSizeInBytes, chunkSize);

            chunkSize = partialFileInfo.ChunkSize;

            var chunks = new byte[partialFileInfo.NumberOfChunks][];

            for (var i = 0; i < partialFileInfo.NumberOfChunks; i++)
            {
                var outputStream = new MemoryStream();
                await _filePersistenceService.GetChunk(userId, fileGuid, chunkSize, i, outputStream);
                chunks[i] = outputStream.ToArray();
            }

            return chunks;
        }
    }
}