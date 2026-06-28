using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Options;
using webFileSharingSystem.Core.Options;
using webFileSharingSystem.Core.Storage;
using webFileSharingSystem.Infrastructure.Storage;
using Xunit;

namespace webFileSharingSystem.IntegrationTests.Storage
{
    public class UploadDownloadTests : IDisposable
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

        public void Dispose()
        {
            if (Directory.Exists(OnPremiseFileLocation))
            {
                Directory.Delete(OnPremiseFileLocation, true);
            }
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
                await _filePersistenceService.GetChunk(UserId, _testFileGuid, chunkSize, i, outputStream, TestContext.Current.CancellationToken);
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

            var chunks = await GetFileChunks(UserId, _testFileGuid, fileSizeInBytes, chunkSize, TestContext.Current.CancellationToken);

            var totalFileSizeFromChunks = 0;

            foreach (var (index, chunk) in chunks.Select((c, index) => (Index: index, Chunk: c))
                         .OrderBy(_ => _random.Next()))
            {
                var dataStream = new MemoryStream(chunk);
                await _filePersistenceService.SaveChunk(UserId, newFileGuid, index, chunkSize, dataStream, TestContext.Current.CancellationToken);
                totalFileSizeFromChunks += chunks[index].Length;
            }


            Assert.Equal(fileSizeInBytes, totalFileSizeFromChunks);

            Assert.True(
                (await File.ReadAllBytesAsync(TestFilePath, TestContext.Current.CancellationToken)).SequenceEqual(
                    await File.ReadAllBytesAsync(savedFilePath, TestContext.Current.CancellationToken)));
        }

        [Fact]
        public async Task SaveChunks_ReconstructsFileWithPartialLastChunk()
        {
            var newFileGuid = Guid.NewGuid();
            var savedFilePath = Path.Combine(OnPremiseFileLocation, newFileGuid.ToString());

            var content = new byte[1_200_000];
            new Random(23).NextBytes(content);

            var chunkSize = 512 * 1024;
            var partialFileInfo = StorageExtensions.GeneratePartialFileInfo(content.Length, chunkSize);
            chunkSize = partialFileInfo.ChunkSize;

            for (var index = 0; index < partialFileInfo.NumberOfChunks; index++)
            {
                var chunk = GetChunk(content, index, chunkSize);
                using var dataStream = new MemoryStream(chunk);
                await _filePersistenceService.SaveChunk(UserId, newFileGuid, index, chunkSize, dataStream, TestContext.Current.CancellationToken);
            }

            var savedBytes = await File.ReadAllBytesAsync(savedFilePath, TestContext.Current.CancellationToken);
            savedBytes.Should().Equal(content);
        }

        [Fact]
        public async Task GetChunk_ReturnsEmpty_WhenChunkIndexOutOfRange()
        {
            var fileInfo = new FileInfo(TestFilePath);
            var fileSizeInBytes = fileInfo.Length;
            var chunkSize = 512 * 1024;

            var partialFileInfo = StorageExtensions.GeneratePartialFileInfo(fileSizeInBytes, chunkSize);
            var invalidIndex = partialFileInfo.NumberOfChunks + 1;

            var outputStream = new MemoryStream();
            await _filePersistenceService.GetChunk(UserId, _testFileGuid, chunkSize, invalidIndex, outputStream,
                TestContext.Current.CancellationToken);

            outputStream.Length.Should().Be(0);
        }

        [Fact]
        public async Task GenerateAndDeleteFile_CreatesAndRemovesFile()
        {
            var newFileGuid = Guid.NewGuid();
            var filePath = Path.Combine(OnPremiseFileLocation, newFileGuid.ToString());

            await _filePersistenceService.GenerateNewFile(UserId, newFileGuid);
            File.Exists(filePath).Should().BeTrue();

            await _filePersistenceService.DeleteExistingFile(UserId, newFileGuid);
            File.Exists(filePath).Should().BeFalse();
        }

        private async Task<byte[][]> GetFileChunks(int userId, Guid fileGuid, long fileSizeInBytes, int chunkSize, CancellationToken token = default)
        {
            var partialFileInfo = StorageExtensions.GeneratePartialFileInfo(fileSizeInBytes, chunkSize);

            chunkSize = partialFileInfo.ChunkSize;

            var chunks = new byte[partialFileInfo.NumberOfChunks][];

            for (var i = 0; i < partialFileInfo.NumberOfChunks; i++)
            {
                var outputStream = new MemoryStream();
                await _filePersistenceService.GetChunk(userId, fileGuid, chunkSize, i, outputStream, token);
                chunks[i] = outputStream.ToArray();
            }

            return chunks;
        }

        private static byte[] GetChunk(byte[] content, int chunkIndex, int chunkSize)
        {
            var offset = chunkIndex * chunkSize;
            var remaining = content.Length - offset;
            var length = remaining > chunkSize ? chunkSize : remaining;

            var chunk = new byte[length];
            Array.Copy(content, offset, chunk, 0, length);
            return chunk;
        }
    }
}