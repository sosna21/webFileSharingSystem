using System;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.IntegrationTests.Helpers;
using webFileSharingSystem.Web.Contracts.Requests;
using Xunit;

namespace webFileSharingSystem.IntegrationTests.Authorization
{
    public class FileAuthorizationTests : IntegrationTestBase
    {
        public FileAuthorizationTests(SqlServerContainerFixture dbFixture) : base(dbFixture)
        {
        }

        [Fact]
        public async Task GetAll_ReturnsUnauthorized_WithoutToken()
        {
            ClearBearerToken();

            var response = await Client.GetAsync("/api/File/GetAll?PageNumber=1&PageSize=10", TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetFilePath_ReturnsUnauthorized_WithoutToken()
        {
            ClearBearerToken();

            var response = await Client.GetAsync("/api/File/GetFilePath/1", TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task CreateDirectory_ReturnsUnauthorized_WithoutToken()
        {
            ClearBearerToken();

            var response = await Client.PostAsync("/api/File/CreateDir/unauth", content: null, cancellationToken: TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Rename_ReturnsUnauthorized_WithoutToken()
        {
            ClearBearerToken();

            var response = await Client.PutAsync("/api/File/Rename/1?name=unauth", content: null, cancellationToken: TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Move_ReturnsUnauthorized_WithoutToken()
        {
            ClearBearerToken();

            var response = await Client.PutAsJsonAsync("/api/File/Move/-1", new[] { 1 }, cancellationToken: TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Copy_ReturnsUnauthorized_WithoutToken()
        {
            ClearBearerToken();

            var response = await Client.PostAsJsonAsync("/api/File/Copy/-1", new[] { 1 }, cancellationToken: TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Delete_ReturnsUnauthorized_WithoutToken()
        {
            ClearBearerToken();

            var response = await Client.DeleteAsync("/api/File/Delete/1", TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task DeleteSharedReadOnly_ReturnsUnauthorized()
        {
            var ownerToken = await RegisterAndLoginAsync("file_auth_owner", "Pass123!", "file_auth_owner@example.com");
            SetBearerToken(ownerToken);

            var content = new byte[1024];
            new Random(5).NextBytes(content);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "shared-readonly.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            });

            await UploadSingleChunkAsync(file.Id, content);
            await CompleteUploadAsync(file.Id);

            var guestToken = await RegisterAndLoginAsync("file_auth_guest", "Pass123!", "file_auth_guest@example.com");
            await AddShareAsync(file.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "file_auth_guest",
                AccessMode = ShareAccessMode.ReadOnly
            });

            SetBearerToken(guestToken);
            var response = await Client.DeleteAsync($"/api/File/Delete/{file.Id}", TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task RenameSharedReadOnly_ReturnsUnauthorized()
        {
            var ownerToken = await RegisterAndLoginAsync("file_auth_owner_rename", "Pass123!", "file_auth_owner_rename@example.com");
            SetBearerToken(ownerToken);

            var content = new byte[1024];
            new Random(11).NextBytes(content);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "shared-readonly-rename.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            });

            await UploadSingleChunkAsync(file.Id, content);
            await CompleteUploadAsync(file.Id);

            var guestToken = await RegisterAndLoginAsync("file_auth_guest_rename", "Pass123!", "file_auth_guest_rename@example.com");
            await AddShareAsync(file.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "file_auth_guest_rename",
                AccessMode = ShareAccessMode.ReadOnly
            });

            SetBearerToken(guestToken);
            var response = await Client.PutAsync($"/api/File/Rename/{file.Id}?name=renamed", content: null, cancellationToken: TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
