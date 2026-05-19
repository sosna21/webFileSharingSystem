using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using FluentAssertions;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.IntegrationTests.Helpers;
using webFileSharingSystem.Web.Contracts.Requests;
using Xunit;

namespace webFileSharingSystem.IntegrationTests.Downloads
{
    public class DownloadUrlTests : IntegrationTestBase
    {
        public DownloadUrlTests(SqlServerContainerFixture dbFixture) : base(dbFixture)
        {
        }

        [Fact]
        public async Task GenerateDownloadUrl_RejectsEmptyFileIds()
        {
            var token = await RegisterAndLoginAsync("download_empty_ids", "Pass123!", "download_empty_ids@example.com");
            SetBearerToken(token);

            var response = await Client.PostAsync("/api/Download/url", content: null);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task GenerateDownloadUrl_RejectsUserWithoutAccess()
        {
            var ownerToken = await RegisterAndLoginAsync("download_owner_block", "Pass123!", "download_owner_block@example.com");
            SetBearerToken(ownerToken);

            var content = new byte[16 * 1024];
            new Random(41).NextBytes(content);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "private.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            });

            await UploadSingleChunkAsync(file.Id, content);
            await CompleteUploadAsync(file.Id);

            var otherToken = await RegisterAndLoginAsync("download_other", "Pass123!", "download_other@example.com");
            SetBearerToken(otherToken);

            var response = await Client.PostAsync($"/api/Download/url?fileIds={file.Id}", content: null);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GenerateDownloadUrl_AllowsOwner()
        {
            var token = await RegisterAndLoginAsync("download_owner_ok", "Pass123!", "download_owner_ok@example.com");
            SetBearerToken(token);

            var content = new byte[16 * 1024];
            new Random(61).NextBytes(content);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "owner.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            });

            await UploadSingleChunkAsync(file.Id, content);
            await CompleteUploadAsync(file.Id);

            var downloadUrl = await GetDownloadUrlAsync(file.Id);
            downloadUrl.Should().NotBeNullOrWhiteSpace();

            using var anonymousClient = CreateAnonymousClient();
            var response = await anonymousClient.GetAsync(downloadUrl);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task GenerateDownloadUrl_RejectsMissingFile()
        {
            var token = await RegisterAndLoginAsync("download_missing_file", "Pass123!", "download_missing_file@example.com");
            SetBearerToken(token);

            var response = await Client.PostAsync("/api/Download/url?fileIds=999999", content: null);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task GenerateDownloadUrl_AllowsSharedUser()
        {
            var ownerToken = await RegisterAndLoginAsync("download_owner_share", "Pass123!", "download_owner_share@example.com");
            SetBearerToken(ownerToken);

            var content = new byte[16 * 1024];
            new Random(53).NextBytes(content);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "shared.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            });

            await UploadSingleChunkAsync(file.Id, content);
            await CompleteUploadAsync(file.Id);

            var guestToken = await RegisterAndLoginAsync("download_guest", "Pass123!", "download_guest@example.com");
            await AddShareAsync(file.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "download_guest",
                AccessMode = ShareAccessMode.ReadOnly
            });

            SetBearerToken(guestToken);

            var downloadUrl = await GetDownloadUrlAsync(file.Id);
            downloadUrl.Should().NotBeNullOrWhiteSpace();

            using var anonymousClient = CreateAnonymousClient();
            var response = await anonymousClient.GetAsync(downloadUrl);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task GenerateDownloadUrl_ForMultipleFiles_ReturnsArchive()
        {
            var token = await RegisterAndLoginAsync("download_multi", "Pass123!", "download_multi@example.com");
            SetBearerToken(token);

            var first = await UploadFileAsync("file-0.bin", 8 * 1024, 71);
            var second = await UploadFileAsync("file-1.bin", 8 * 1024, 73);

            var urlResponse = await Client.PostAsync($"/api/Download/url?fileIds={first}&fileIds={second}", content: null);
            urlResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var downloadUrl = await ExtractDownloadUrlAsync(urlResponse);
            downloadUrl.Should().NotBeNullOrWhiteSpace();
            downloadUrl!.Should().Contain("/api/Download/archive");

            using var anonymousClient = CreateAnonymousClient();
            var response = await anonymousClient.GetAsync(downloadUrl);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            response.Content.Headers.ContentType!.MediaType.Should().Be("application/octet-stream");
        }

        private async Task<string?> GetDownloadUrlAsync(int fileId)
        {
            var urlResponse = await Client.PostAsync($"/api/Download/url?fileIds={fileId}", content: null);
            urlResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            return await ExtractDownloadUrlAsync(urlResponse);
        }

        private async Task<int> UploadFileAsync(string fileName, int sizeBytes, int seed)
        {
            var content = new byte[sizeBytes];
            new Random(seed).NextBytes(content);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = fileName,
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            });

            await UploadSingleChunkAsync(file.Id, content);
            await CompleteUploadAsync(file.Id);
            return file.Id;
        }

        private static async Task<string?> ExtractDownloadUrlAsync(HttpResponseMessage response)
        {
            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<DownloadUrlResponse>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return result?.Url;
        }

        private sealed class DownloadUrlResponse
        {
            public string Url { get; set; } = string.Empty;
        }
    }
}
