using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using webFileSharingSystem.Core.Options;
using webFileSharingSystem.Core.Storage;
using webFileSharingSystem.Infrastructure.Storage.OnPremise;
using Xunit;

namespace webFileSharingSystem.IntegrationTests
{
    public class UploadDownload
    {
        private readonly Random _random = new();
        
        private readonly FilePersistenceService _filePersistenceService = new FilePersistenceService(
            Options.Create(new StorageSettings
        {
            UserDefaultQuota = 0,
            OnPremiseFileLocation = "./TestResources"
        }));
        
        [Fact]
        public async Task GetChunks()
        {
            const string filePath = "./Resources/testFile4kPhoto.jpg";
            var fileInfo = new FileInfo(filePath);

            var fileSizeInBytes = fileInfo.Length; // 1MB
            var chunkSize = 512 * 1024; //0.5MB

            var partialFileInfo = StorageExtensions.GeneratePartialFileInfo(fileSizeInBytes, chunkSize);

            chunkSize = partialFileInfo.ChunkSize;

            var totalFileSizeFromChunks = 0;
            for (var i = 0; i < partialFileInfo.NumberOfChunks; i++)
            {
                var chunk = await _filePersistenceService.GetChunk(filePath, chunkSize, i);
                Assert.NotNull(chunk);
                Assert.NotEmpty(chunk);
                var expectedChunkSize = i < partialFileInfo.NumberOfChunks - 1
                    ? partialFileInfo.ChunkSize
                    : partialFileInfo.LastChunkSize;
                Assert.Equal(expectedChunkSize, chunk.Length);
                totalFileSizeFromChunks += chunk.Length;
            }

            Assert.Equal(fileSizeInBytes, totalFileSizeFromChunks);
        }

        [Fact]
        public async Task SaveChunks()
        {
            const string filePath = "./Resources/testFile4kPhoto.jpg";
            const string savedTestFilePath = "./Resources/testFileSave.jpg";

            File.Delete(savedTestFilePath);

            var fileInfo = new FileInfo(filePath);
            var fileSizeInBytes = fileInfo.Length; // 1MB
            var chunkSize = 512 * 1024; //0.5MB

            var chunks = await GetFileChunks(fileSizeInBytes, filePath, chunkSize);

            var totalFileSizeFromChunks = 0;

            foreach (var (index, chunk) in chunks.Select((c, index) => (Index: index, Chunk: c))
                .OrderBy(_ => _random.Next()))
            {
                await _filePersistenceService.SaveChunk(savedTestFilePath, index, chunkSize, chunk);
                totalFileSizeFromChunks += chunks[index].Length;
            }


            Assert.Equal(fileSizeInBytes, totalFileSizeFromChunks);

            Assert.True(
                (await File.ReadAllBytesAsync(filePath)).SequenceEqual(
                    await File.ReadAllBytesAsync(savedTestFilePath)));
        }

        [Fact]
        public async Task SaveChunksMultithreading()
        {
            const string filePath = "./Resources/testFile4kPhoto.jpg";
            const string savedTestFilePath = "./Resources/testFileSave.jpg";

            File.Delete(savedTestFilePath);

            var fileInfo = new FileInfo(filePath);
            var fileSizeInBytes = fileInfo.Length; // 1MB
            var chunkSize = 512 * 1024; //0.5MB

            var chunks = await GetFileChunks(fileSizeInBytes, filePath, chunkSize);

            var totalFileSizeFromChunks = 0;

            var shuffledChunks = chunks.Select((c, index) => (Index: index, Chunk: c)).OrderBy(_ => _random.Next());

            Parallel.ForEach(shuffledChunks, async item =>
            {
                await _filePersistenceService.SaveChunk(savedTestFilePath, item.Index, chunkSize, item.Chunk);
                totalFileSizeFromChunks += chunks[item.Index].Length;
            });

            Assert.Equal(fileSizeInBytes, totalFileSizeFromChunks);

            Assert.True(
                (await File.ReadAllBytesAsync(filePath)).SequenceEqual(
                    await File.ReadAllBytesAsync(savedTestFilePath)));
        }

        //[Fact]
        public async Task SaveChunksMultithreadingMulti()
        {
            const string filePath = "./Resources/testFile4kPhoto.jpg";
            const string savedTestFilePath = "./Resources/testFileSave.jpg";

            File.Delete(savedTestFilePath);

            var fileInfo = new FileInfo(filePath);
            var fileSizeInBytes = fileInfo.Length; // 1MB
            var chunkSize = 512 * 1024; //0.5MB

            var chunks = await GetFileChunks(fileSizeInBytes, filePath, chunkSize);

            const string saveToFileMulti = "./Resources/MultiTest/";

            Directory.CreateDirectory(saveToFileMulti);

            Parallel.ForEach(Enumerable.Range(1, 100), _ =>
            {
                var shuffledChunks = chunks.Select((c, index) => (Index: index, Chunk: c)).OrderBy(_ => _random.Next());

                var fileName = Path.Combine(saveToFileMulti, Guid.NewGuid().ToString());

                Parallel.ForEach(shuffledChunks,
                    async item =>
                    {
                        await _filePersistenceService.SaveChunk(fileName, item.Index, chunkSize, item.Chunk);
                    });
            });
        }


        private async Task<byte[][]> GetFileChunks(long fileSizeInBytes, string filePath, int chunkSize)
        {
            var partialFileInfo = StorageExtensions.GeneratePartialFileInfo(fileSizeInBytes, chunkSize);

            chunkSize = partialFileInfo.ChunkSize;

            var chunks = new byte[partialFileInfo.NumberOfChunks][];

            for (var i = 0; i < partialFileInfo.NumberOfChunks; i++)
            {
                chunks[i] = await _filePersistenceService.GetChunk(filePath, chunkSize, i);
            }

            return chunks;
        }
    }
}