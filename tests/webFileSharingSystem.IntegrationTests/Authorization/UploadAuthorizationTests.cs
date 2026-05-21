using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.IntegrationTests.Helpers;
using webFileSharingSystem.Web.Contracts.Requests;
using Xunit;

namespace webFileSharingSystem.IntegrationTests.Authorization
{
    public class UploadAuthorizationTests(SqlServerContainerFixture dbFixture) : IntegrationTestBase(dbFixture)
    {
        [Fact]
        public async Task StartUpload_ReturnsUnauthorized_WithoutToken()
        {
            ClearBearerToken();

            var response = await Client.PostAsJsonAsync("/api/Upload/Start", new UploadFileInfoRequest
            {
                FileName = "no-auth.bin",
                Size = 64,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task UploadChunk_ReturnsUnauthorized_WithoutToken()
        {
            ClearBearerToken();

            using var form = new MultipartFormDataContent();
            using var chunkContent = new ByteArrayContent(new byte[128]);
            form.Add(chunkContent, "chunk", "chunk.bin");

            var response = await Client.PutAsync("/api/Upload/1/Chunk/0", form, TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task CompleteUpload_ReturnsUnauthorized_WithoutToken()
        {
            ClearBearerToken();

            var response = await Client.PutAsync("/api/Upload/1/Complete", content: null, cancellationToken: TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task PauseUpload_ReturnsUnauthorized_WithoutToken()
        {
            ClearBearerToken();

            var response = await Client.PutAsync("/api/Upload/1/Pause", content: null, cancellationToken: TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task MissingChunks_ReturnsUnauthorized_WithoutToken()
        {
            ClearBearerToken();

            var response = await Client.GetAsync("/api/Upload/1/MissingChunks", TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task EnsureDirectory_ReturnsUnauthorized_WithoutToken()
        {
            ClearBearerToken();

            var response = await Client.PostAsJsonAsync("/api/Upload/EnsureDirectory", new EnsureDirectoryRequest
            {
                ParentId = null,
                Folders = new[] { "root" }
            }, cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task EnsureDirectory_ReturnsBadRequest_WhenSharedReadOnly()
        {
            var ownerToken = await RegisterAndLoginAsync("upload_auth_owner", "Pass123!", "upload_auth_owner@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var directory = await CreateDirectoryAsync($"shared-auth-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("upload_auth_guest", "Pass123!", "upload_auth_guest@example.com",
                TestContext.Current.CancellationToken);
            await AddShareAsync(directory.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "upload_auth_guest",
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);
            var response = await Client.PostAsJsonAsync("/api/Upload/EnsureDirectory", new EnsureDirectoryRequest
            {
                ParentId = directory.Id,
                Folders = new[] { "child" }
            }, cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task CompleteUpload_ReturnsBadRequest_WhenUserNotOwner()
        {
            var ownerToken = await RegisterAndLoginAsync("upload_complete_owner", "Pass123!", "upload_complete_owner@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "owner-only.bin",
                Size = 256,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, TestContext.Current.CancellationToken);

            var otherToken = await RegisterAndLoginAsync("upload_complete_other", "Pass123!", "upload_complete_other@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(otherToken);

            var response = await Client.PutAsync($"/api/Upload/{file.Id}/Complete", content: null,
                cancellationToken: TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task MissingChunks_ReturnsBadRequest_WhenUserNotOwner()
        {
            var ownerToken = await RegisterAndLoginAsync("upload_missing_owner", "Pass123!", "upload_missing_owner@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "owner-missing.bin",
                Size = 256,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, TestContext.Current.CancellationToken);

            var otherToken = await RegisterAndLoginAsync("upload_missing_other", "Pass123!", "upload_missing_other@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(otherToken);

            var response = await Client.GetAsync($"/api/Upload/{file.Id}/MissingChunks", TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }
}