using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.IntegrationTests.Helpers;
using webFileSharingSystem.Web.Contracts.Requests;
using webFileSharingSystem.Web.Contracts.Responses;
using Xunit;
using File = webFileSharingSystem.Core.Entities.File;

namespace webFileSharingSystem.IntegrationTests.Uploads
{
    public class UploadEdgeCaseTests : IntegrationTestBase
    {
        public UploadEdgeCaseTests(SqlServerContainerFixture dbFixture) : base(dbFixture)
        {
        }

        [Fact]
        public async Task StartUpload_ReturnsBadRequest_WhenFileNameEmpty()
        {
            var token = await RegisterAndLoginAsync("upload_empty_name", "Pass123!", "upload_empty_name@example.com");
            SetBearerToken(token);

            var response = await Client.PostAsJsonAsync("/api/Upload/Start", new UploadFileInfoRequest
            {
                FileName = string.Empty,
                Size = 128,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task StartUpload_ReturnsBadRequest_WhenSizeNegative()
        {
            var token = await RegisterAndLoginAsync("upload_negative_size", "Pass123!", "upload_negative_size@example.com");
            SetBearerToken(token);

            var response = await Client.PostAsJsonAsync("/api/Upload/Start", new UploadFileInfoRequest
            {
                FileName = "negative.bin",
                Size = -1,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task StartUpload_ReturnsBadRequest_WhenParentIsFile()
        {
            var token = await RegisterAndLoginAsync("upload_parent_file", "Pass123!", "upload_parent_file@example.com");
            SetBearerToken(token);

            var content = new byte[4 * 1024];
            new Random(5).NextBytes(content);

            var parentFile = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "parent.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            });

            await UploadSingleChunkAsync(parentFile.Id, content);
            await CompleteUploadAsync(parentFile.Id);

            var response = await Client.PostAsJsonAsync("/api/Upload/Start", new UploadFileInfoRequest
            {
                FileName = "child.bin",
                Size = 128,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream",
                ParentId = parentFile.Id
            }, TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task StartUpload_ReturnsBadRequest_WhenParentMissing()
        {
            var token = await RegisterAndLoginAsync("upload_parent_missing", "Pass123!", "upload_parent_missing@example.com");
            SetBearerToken(token);

            var response = await Client.PostAsJsonAsync("/api/Upload/Start", new UploadFileInfoRequest
            {
                FileName = "missing-parent.bin",
                Size = 128,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream",
                ParentId = 999999
            }, TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var errors = await response.Content.ReadFromJsonAsync<string[]>(cancellationToken: TestContext.Current.CancellationToken);
            errors.Should().NotBeNull();
            errors!.Should().Contain("Target directory not found");
        }

        [Fact]
        public async Task UploadChunk_ReturnsBadRequest_WhenFileMissing()
        {
            var token = await RegisterAndLoginAsync("upload_missing_file", "Pass123!", "upload_missing_file@example.com");
            SetBearerToken(token);

            var response = await UploadChunkAsync(999999, 0, new byte[1024]);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task UploadChunk_ReturnsBadRequest_WhenChunkIndexOutOfRange()
        {
            var token = await RegisterAndLoginAsync("upload_chunk_range", "Pass123!", "upload_chunk_range@example.com");
            SetBearerToken(token);

            var (fileId, chunkSize, numberOfChunks) = await StartUploadWithInfoAsync("range.bin", 600 * 1024);
            var invalidIndex = numberOfChunks;

            var response = await UploadChunkAsync(fileId, invalidIndex, new byte[chunkSize]);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task UploadChunk_ReturnsBadRequest_WhenChunkIndexNegative()
        {
            var token = await RegisterAndLoginAsync("upload_chunk_negative", "Pass123!", "upload_chunk_negative@example.com");
            SetBearerToken(token);

            var (fileId, chunkSize, _) = await StartUploadWithInfoAsync("negative-index.bin", 600 * 1024);

            var response = await UploadChunkAsync(fileId, -1, new byte[chunkSize]);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task UploadChunk_AllowsOutOfOrder()
        {
            var token = await RegisterAndLoginAsync("upload_chunk_out_order", "Pass123!", "upload_chunk_out_order@example.com");
            SetBearerToken(token);

            var sizeBytes = 3 * 1024 * 1024;
            var content = new byte[sizeBytes];
            new Random(61).NextBytes(content);

            var (fileId, chunkSize, numberOfChunks) = await StartUploadWithInfoAsync("out-of-order.bin", sizeBytes);
            numberOfChunks.Should().BeGreaterThan(1);

            var responseFirst = await UploadChunkAsync(fileId, 1, GetChunk(content, 1, chunkSize));
            responseFirst.StatusCode.Should().Be(HttpStatusCode.OK);

            var responseSecond = await UploadChunkAsync(fileId, 0, GetChunk(content, 0, chunkSize));
            responseSecond.StatusCode.Should().Be(HttpStatusCode.OK);

            for (var index = 2; index < numberOfChunks; index++)
            {
                var response = await UploadChunkAsync(fileId, index, GetChunk(content, index, chunkSize));
                response.StatusCode.Should().Be(HttpStatusCode.OK);
            }

            var completeResponse = await Client.PutAsync($"/api/Upload/{fileId}/Complete", content: null, TestContext.Current.CancellationToken);
            completeResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task UploadChunk_ReturnsBadRequest_WhenUserNotOwner()
        {
            var ownerToken = await RegisterAndLoginAsync("upload_chunk_owner", "Pass123!", "upload_chunk_owner@example.com");
            SetBearerToken(ownerToken);

            var (fileId, chunkSize, _) = await StartUploadWithInfoAsync("owner-only.bin", 600 * 1024);

            var otherToken = await RegisterAndLoginAsync("upload_chunk_other", "Pass123!", "upload_chunk_other@example.com");
            SetBearerToken(otherToken);

            var response = await UploadChunkAsync(fileId, 0, new byte[chunkSize]);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task CompleteUpload_ReturnsBadRequest_WhenChunksMissing()
        {
            var token = await RegisterAndLoginAsync("upload_missing_chunks", "Pass123!", "upload_missing_chunks@example.com");
            SetBearerToken(token);

            var (fileId, chunkSize, _) = await StartUploadWithInfoAsync("missing-chunks.bin", 1200 * 1024);

            await UploadChunkAsync(fileId, 0, new byte[chunkSize]);

            var response = await Client.PutAsync($"/api/Upload/{fileId}/Complete", content: null, TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task UploadChunk_ReturnsBadRequest_WhenCompleted()
        {
            var token = await RegisterAndLoginAsync("upload_chunk_completed", "Pass123!", "upload_chunk_completed@example.com");
            SetBearerToken(token);

            var fileId = await UploadCompletedFileAsync("completed-chunk.bin", 128 * 1024, 33);

            var response = await UploadChunkAsync(fileId, 0, new byte[128]);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task PauseUpload_ReturnsBadRequest_WhenFileMissing()
        {
            var token = await RegisterAndLoginAsync("upload_pause_missing", "Pass123!", "upload_pause_missing@example.com");
            SetBearerToken(token);

            var response = await Client.PutAsync("/api/Upload/999999/Pause", content: null, TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task PauseUpload_ReturnsBadRequest_WhenUserNotOwner()
        {
            var ownerToken = await RegisterAndLoginAsync("upload_pause_owner", "Pass123!", "upload_pause_owner@example.com");
            SetBearerToken(ownerToken);

            var (fileId, _, _) = await StartUploadWithInfoAsync("pause-owner.bin", 600 * 1024);

            var otherToken = await RegisterAndLoginAsync("upload_pause_other", "Pass123!", "upload_pause_other@example.com");
            SetBearerToken(otherToken);

            var response = await Client.PutAsync($"/api/Upload/{fileId}/Pause", content: null, TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task PauseUpload_ReturnsBadRequest_WhenCompleted()
        {
            var token = await RegisterAndLoginAsync("upload_pause_completed", "Pass123!", "upload_pause_completed@example.com");
            SetBearerToken(token);

            var fileId = await UploadCompletedFileAsync("pause-complete.bin", 128 * 1024, 19);

            var response = await Client.PutAsync($"/api/Upload/{fileId}/Pause", content: null, TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task CancelUpload_ReturnsUnauthorized_WhenUserNotOwner()
        {
            var ownerToken = await RegisterAndLoginAsync("upload_cancel_owner", "Pass123!", "upload_cancel_owner@example.com");
            SetBearerToken(ownerToken);

            var (fileId, _, _) = await StartUploadWithInfoAsync("cancel-owner.bin", 600 * 1024);

            var otherToken = await RegisterAndLoginAsync("upload_cancel_other", "Pass123!", "upload_cancel_other@example.com");
            SetBearerToken(otherToken);

            var response = await Client.DeleteAsync($"/api/File/Delete/{fileId}", TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task CancelUpload_AfterCompletion_DeletesFile()
        {
            var token = await RegisterAndLoginAsync("upload_cancel_completed", "Pass123!", "upload_cancel_completed@example.com");
            SetBearerToken(token);

            var fileId = await UploadCompletedFileAsync("cancel-complete.bin", 128 * 1024, 27);

            var response = await Client.DeleteAsync($"/api/File/Delete/{fileId}", TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var list = await GetFilesAsync();
            list.Items.Should().NotContain(item => item.Id == fileId);
        }

        [Fact]
        public async Task UploadChunk_ReturnsBadRequest_AfterCancel()
        {
            var token = await RegisterAndLoginAsync("upload_chunk_after_cancel", "Pass123!", "upload_chunk_after_cancel@example.com");
            SetBearerToken(token);

            var (fileId, chunkSize, _) = await StartUploadWithInfoAsync("after-cancel.bin", 600 * 1024);

            var deleteResponse = await Client.DeleteAsync($"/api/File/Delete/{fileId}", TestContext.Current.CancellationToken);
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await UploadChunkAsync(fileId, 0, new byte[chunkSize]);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task EnsureDirectory_ReturnsBadRequest_WhenFoldersEmpty()
        {
            var token = await RegisterAndLoginAsync("ensure_empty_folders", "Pass123!", "ensure_empty_folders@example.com");
            SetBearerToken(token);

            var response = await Client.PostAsJsonAsync("/api/Upload/EnsureDirectory", new EnsureDirectoryRequest
            {
                ParentId = null,
                Folders = Array.Empty<string>()
            }, TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task EnsureDirectory_ReturnsBadRequest_WhenParentIsFile()
        {
            var token = await RegisterAndLoginAsync("ensure_parent_file", "Pass123!", "ensure_parent_file@example.com");
            SetBearerToken(token);

            var content = new byte[4 * 1024];
            new Random(9).NextBytes(content);

            var parentFile = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "ensure-parent.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            });

            await UploadSingleChunkAsync(parentFile.Id, content);
            await CompleteUploadAsync(parentFile.Id);

            var response = await Client.PostAsJsonAsync("/api/Upload/EnsureDirectory", new EnsureDirectoryRequest
            {
                ParentId = parentFile.Id,
                Folders = new[] { "child" }
            }, TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        private async Task<(int FileId, int ChunkSize, int NumberOfChunks)> StartUploadWithInfoAsync(string fileName, int sizeBytes)
        {
            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = fileName,
                Size = sizeBytes,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            });

            var chunkSize = 0;
            var numberOfChunks = 0;

            await WithDbContextAsync(async context =>
            {
                var entity = await context.Set<File>()
                    .Include(f => f.PartialFileInfo)
                    .SingleAsync(f => f.Id == file.Id);
                entity.PartialFileInfo.Should().NotBeNull();

                chunkSize = entity.PartialFileInfo!.ChunkSize;
                numberOfChunks = entity.PartialFileInfo.NumberOfChunks;
            });

            return (file.Id, chunkSize, numberOfChunks);
        }

        private async Task<int> UploadCompletedFileAsync(string fileName, int sizeBytes, int seed)
        {
            var content = new byte[sizeBytes];
            new Random(seed).NextBytes(content);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = fileName,
                Size = sizeBytes,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            });

            await UploadSingleChunkAsync(file.Id, content);
            await CompleteUploadAsync(file.Id);
            return file.Id;
        }

        private async Task<PaginatedListResponse<FileResponse>> GetFilesAsync()
        {
            var listResponse = await Client.GetAsync("/api/File/GetAll?PageNumber=1&PageSize=50", TestContext.Current.CancellationToken);
            listResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var list = await listResponse.Content.ReadFromJsonAsync<PaginatedListResponse<FileResponse>>();
            list.Should().NotBeNull();
            return list!;
        }

        private sealed class PaginatedListResponse<T>
        {
            public T[] Items { get; set; } = Array.Empty<T>();
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

        private async Task<HttpResponseMessage> UploadChunkAsync(int fileId, int chunkIndex, byte[] content)
        {
            using var form = new MultipartFormDataContent();
            using var chunkContent = new ByteArrayContent(content);
            form.Add(chunkContent, "chunk", "chunk.bin");

            return await Client.PutAsync($"/api/Upload/{fileId}/Chunk/{chunkIndex}", form, TestContext.Current.CancellationToken);
        }
    }
}
