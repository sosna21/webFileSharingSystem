using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using webFileSharingSystem.IntegrationTests.Helpers;
using webFileSharingSystem.Web.Contracts.Requests;
using webFileSharingSystem.Web.Contracts.Responses;
using Xunit;
using File = webFileSharingSystem.Core.Entities.File;

namespace webFileSharingSystem.IntegrationTests.Uploads
{
    public class UploadFlowTests(SqlServerContainerFixture dbFixture) : IntegrationTestBase(dbFixture)
    {
        private const int DefaultChunkSize = 512 * 1024;

        [Fact]
        public async Task UploadSingleChunk_CompletesAndAppearsInList()
        {
            var token = await RegisterAndLoginAsync("user_upload", "Pass123!", "user_upload@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var content = new byte[128 * 1024];
            new Random(42).NextBytes(content);

            var startResponse = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "sample.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, TestContext.Current.CancellationToken);

            await UploadSingleChunkAsync(startResponse.Id, content, TestContext.Current.CancellationToken);

            var missingChunksResponse = await Client.GetAsync($"/api/Upload/{startResponse.Id}/MissingChunks", TestContext.Current.CancellationToken);
            missingChunksResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var missingChunks =
                await missingChunksResponse.Content.ReadFromJsonAsync<int[]>(cancellationToken: TestContext.Current.CancellationToken);
            missingChunks.Should().NotBeNull();
            missingChunks!.Should().BeEmpty();

            await CompleteUploadAsync(startResponse.Id, TestContext.Current.CancellationToken);

            var listResponse = await Client.GetAsync("/api/File/GetAll?PageNumber=1&PageSize=10", TestContext.Current.CancellationToken);
            listResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var list = await listResponse.Content.ReadFromJsonAsync<PaginatedListResponse<FileResponse>>(
                cancellationToken: TestContext.Current.CancellationToken);
            list.Should().NotBeNull();
            list!.Items.Should().ContainSingle(item => item.Id == startResponse.Id && item.FileStatus == Core.Entities.FileStatus.Completed);

            await AssertStoredFileEqualsAsync(startResponse.Id, content, TestContext.Current.CancellationToken);
        }

        [Fact]
        public async Task UploadMultiChunk_CompletesAfterMissingChunksUploaded()
        {
            var token = await RegisterAndLoginAsync("user_upload_multi", "Pass123!", "user_upload_multi@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var content = new byte[DefaultChunkSize * 2 + 10];
            new Random(17).NextBytes(content);

            var startResponse = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "multi.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, TestContext.Current.CancellationToken);

            await UploadChunkAsync(startResponse.Id, 0, GetChunk(content, 0), TestContext.Current.CancellationToken);

            var missingChunksResponse = await Client.GetAsync($"/api/Upload/{startResponse.Id}/MissingChunks", TestContext.Current.CancellationToken);
            missingChunksResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var missingChunks =
                await missingChunksResponse.Content.ReadFromJsonAsync<int[]>(cancellationToken: TestContext.Current.CancellationToken);
            missingChunks.Should().NotBeNull();
            missingChunks.Should().Contain(1);
            missingChunks.Should().Contain(2);

            await UploadChunkAsync(startResponse.Id, 1, GetChunk(content, 1), TestContext.Current.CancellationToken);
            await UploadChunkAsync(startResponse.Id, 2, GetChunk(content, 2), TestContext.Current.CancellationToken);

            await CompleteUploadAsync(startResponse.Id, TestContext.Current.CancellationToken);

            var listResponse = await Client.GetAsync("/api/File/GetAll?PageNumber=1&PageSize=10", TestContext.Current.CancellationToken);
            listResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var list = await listResponse.Content.ReadFromJsonAsync<PaginatedListResponse<FileResponse>>(
                cancellationToken: TestContext.Current.CancellationToken);
            list.Should().NotBeNull();
            list!.Items.Should().ContainSingle(item => item.Id == startResponse.Id && item.FileStatus == Core.Entities.FileStatus.Completed);

            await AssertStoredFileEqualsAsync(startResponse.Id, content, TestContext.Current.CancellationToken);
        }

        [Fact]
        public async Task PauseAndResume_SameFileSucceeds_DifferentFileCompletionFails()
        {
            var token = await RegisterAndLoginAsync("user_upload_pause", "Pass123!", "user_upload_pause@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var content = new byte[DefaultChunkSize * 2];
            new Random(23).NextBytes(content);

            var firstUpload = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "pause.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, TestContext.Current.CancellationToken);

            await UploadChunkAsync(firstUpload.Id, 0, GetChunk(content, 0), TestContext.Current.CancellationToken);

            var pauseResponse = await Client.PutAsync($"/api/Upload/{firstUpload.Id}/Pause", content: null,
                cancellationToken: TestContext.Current.CancellationToken);
            pauseResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var missingChunksResponse = await Client.GetAsync($"/api/Upload/{firstUpload.Id}/MissingChunks", TestContext.Current.CancellationToken);
            missingChunksResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var missingChunks =
                await missingChunksResponse.Content.ReadFromJsonAsync<int[]>(cancellationToken: TestContext.Current.CancellationToken);
            missingChunks.Should().NotBeNull();
            missingChunks!.Should().Contain(1);

            await UploadChunkAsync(firstUpload.Id, 1, GetChunk(content, 1), TestContext.Current.CancellationToken);
            await CompleteUploadAsync(firstUpload.Id, TestContext.Current.CancellationToken);

            var secondUpload = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "pause-other.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, TestContext.Current.CancellationToken);

            await UploadChunkAsync(secondUpload.Id, 0, GetChunk(content, 0), TestContext.Current.CancellationToken);

            var pauseSecondResponse = await Client.PutAsync($"/api/Upload/{secondUpload.Id}/Pause", content: null,
                cancellationToken: TestContext.Current.CancellationToken);
            pauseSecondResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var completeSecondResponse = await Client.PutAsync($"/api/Upload/{secondUpload.Id}/Complete", content: null,
                cancellationToken: TestContext.Current.CancellationToken);
            completeSecondResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task CancelOngoingUpload_RemovesFileAndStorage()
        {
            var token = await RegisterAndLoginAsync("user_upload_cancel", "Pass123!", "user_upload_cancel@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var content = new byte[DefaultChunkSize];
            new Random(31).NextBytes(content);

            var startResponse = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "cancel.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, TestContext.Current.CancellationToken);

            await UploadChunkAsync(startResponse.Id, 0, GetChunk(content, 0), TestContext.Current.CancellationToken);

            var storageRoot = await GetStorageRootAsync();
            Guid fileGuid = Guid.Empty;
            await WithDbContextAsync(async context =>
            {
                var file = await context.Set<File>().FindAsync(startResponse.Id);
                fileGuid = file!.FileGuid!.Value;
            });

            var deleteResponse = await Client.DeleteAsync($"/api/File/Delete/{startResponse.Id}", TestContext.Current.CancellationToken);
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var list = await GetFilesAsync(TestContext.Current.CancellationToken);
            list.Items.Should().NotContain(item => item.Id == startResponse.Id);

            var filePath = Path.Combine(storageRoot, fileGuid.ToString());
            System.IO.File.Exists(filePath).Should().BeFalse();
        }

        [Fact]
        public async Task CancelPausedUpload_RemovesFileAndStorage()
        {
            var token = await RegisterAndLoginAsync("user_upload_cancel_pause", "Pass123!", "user_upload_cancel_pause@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var content = new byte[DefaultChunkSize];
            new Random(41).NextBytes(content);

            var startResponse = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "cancel-pause.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, TestContext.Current.CancellationToken);

            await UploadChunkAsync(startResponse.Id, 0, GetChunk(content, 0), TestContext.Current.CancellationToken);

            var pauseResponse = await Client.PutAsync($"/api/Upload/{startResponse.Id}/Pause", content: null,
                cancellationToken: TestContext.Current.CancellationToken);
            pauseResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var storageRoot = await GetStorageRootAsync();
            Guid fileGuid = Guid.Empty;
            await WithDbContextAsync(async context =>
            {
                var file = await context.Set<File>().FindAsync(startResponse.Id);
                fileGuid = file!.FileGuid!.Value;
            });

            var deleteResponse = await Client.DeleteAsync($"/api/File/Delete/{startResponse.Id}", TestContext.Current.CancellationToken);
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var list = await GetFilesAsync(TestContext.Current.CancellationToken);
            list.Items.Should().NotContain(item => item.Id == startResponse.Id);

            var filePath = Path.Combine(storageRoot, fileGuid.ToString());
            System.IO.File.Exists(filePath).Should().BeFalse();
        }

        private sealed class PaginatedListResponse<T>
        {
            public T[] Items { get; set; } = Array.Empty<T>();
        }

        private async Task<PaginatedListResponse<FileResponse>> GetFilesAsync(CancellationToken token = default)
        {
            var listResponse = await Client.GetAsync("/api/File/GetAll?PageNumber=1&PageSize=50", token);
            listResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var list = await listResponse.Content.ReadFromJsonAsync<PaginatedListResponse<FileResponse>>(cancellationToken: token);
            list.Should().NotBeNull();
            return list!;
        }

        private async Task AssertStoredFileEqualsAsync(int fileId, byte[] expected, CancellationToken token = default)
        {
            var storageRoot = await GetStorageRootAsync();
            var fileGuid = Guid.Empty;
            await WithDbContextAsync(async context =>
            {
                var file = await context.Set<File>().FindAsync(fileId);
                fileGuid = file!.FileGuid!.Value;
            });

            var filePath = Path.Combine(storageRoot, fileGuid.ToString());
            var actual = await System.IO.File.ReadAllBytesAsync(filePath, token);
            actual.Should().Equal(expected);
        }

        private async Task UploadChunkAsync(int fileId, int chunkIndex, byte[] chunk, CancellationToken token = default)
        {
            using var form = new MultipartFormDataContent();
            using var chunkContent = new ByteArrayContent(chunk);
            form.Add(chunkContent, "chunk", $"chunk-{chunkIndex}.bin");

            var response = await Client.PutAsync($"/api/Upload/{fileId}/Chunk/{chunkIndex}", form, token);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        private static byte[] GetChunk(byte[] content, int chunkIndex)
        {
            var offset = chunkIndex * DefaultChunkSize;
            var remaining = content.Length - offset;
            var length = remaining > DefaultChunkSize ? DefaultChunkSize : remaining;

            var chunk = new byte[length];
            Array.Copy(content, offset, chunk, 0, length);
            return chunk;
        }
    }
}