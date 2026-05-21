using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using FluentAssertions;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.IntegrationTests.Helpers;
using webFileSharingSystem.Web.Contracts.Requests;
using Xunit;
using File = webFileSharingSystem.Core.Entities.File;

namespace webFileSharingSystem.IntegrationTests.Storage
{
    public class FileStorageCleanupTests : IntegrationTestBase
    {
        public FileStorageCleanupTests(SqlServerContainerFixture dbFixture) : base(dbFixture)
        {
        }

        [Fact]
        public async Task DeleteCompletedFile_RemovesFileFromStorage()
        {
            var token = await RegisterAndLoginAsync("storage_delete_complete", "Pass123!", "storage_delete_complete@example.com");
            SetBearerToken(token);

            var fileId = await UploadAndCompleteAsync("delete-complete.bin", 512 * 1024, 37);

            var storageRoot = await GetStorageRootAsync();
            Guid fileGuid = Guid.Empty;
            await WithDbContextAsync(async context =>
            {
                var file = await context.Set<File>().FindAsync(fileId);
                fileGuid = file!.FileGuid!.Value;
            });

            var deleteResponse = await Client.DeleteAsync($"/api/File/Delete/{fileId}", TestContext.Current.CancellationToken);
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var filePath = Path.Combine(storageRoot, fileGuid.ToString());
            System.IO.File.Exists(filePath).Should().BeFalse();
        }

        [Fact]
        public async Task DeleteFolder_RemovesNestedFilesFromStorage()
        {
            var token = await RegisterAndLoginAsync("storage_delete_folder", "Pass123!", "storage_delete_folder@example.com");
            SetBearerToken(token);

            var parent = await CreateDirectoryAsync($"parent-{Guid.NewGuid():N}");
            var child = await CreateDirectoryAsync($"child-{Guid.NewGuid():N}", parent.Id);

            var parentFileId = await UploadAndCompleteAsync("parent.bin", 64 * 1024, 41, parent.Id);
            var childFileId = await UploadAndCompleteAsync("child.bin", 64 * 1024, 43, child.Id);

            var storageRoot = await GetStorageRootAsync();
            var fileGuids = new[] { parentFileId, childFileId }.Select(_ => Guid.Empty).ToArray();
            await WithDbContextAsync(async context =>
            {
                var parentFile = await context.Set<File>().FindAsync(parentFileId);
                var childFile = await context.Set<File>().FindAsync(childFileId);
                fileGuids[0] = parentFile!.FileGuid!.Value;
                fileGuids[1] = childFile!.FileGuid!.Value;
            });

            var deleteResponse = await Client.DeleteAsync($"/api/File/Delete/{parent.Id}", TestContext.Current.CancellationToken);
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            foreach (var guid in fileGuids)
            {
                var filePath = Path.Combine(storageRoot, guid.ToString());
                System.IO.File.Exists(filePath).Should().BeFalse();
            }
        }

        private async Task<int> UploadAndCompleteAsync(string fileName, int sizeBytes, int seed, int? parentId = null)
        {
            var content = new byte[sizeBytes];
            new Random(seed).NextBytes(content);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = fileName,
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream",
                ParentId = parentId
            });

            await UploadSingleChunkAsync(file.Id, content);
            await CompleteUploadAsync(file.Id);
            return file.Id;
        }
    }
}
