using System;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.IntegrationTests.Helpers;
using webFileSharingSystem.Web.Contracts.Requests;
using Xunit;

namespace webFileSharingSystem.IntegrationTests.Downloads
{
    public class DownloadUrlTests(SqlServerContainerFixture dbFixture) : IntegrationTestBase(dbFixture)
    {
        [Fact]
        public async Task GenerateDownloadUrl_RejectsEmptyFileIds()
        {
            var token = await RegisterAndLoginAsync("download_empty_ids", "Pass123!", "download_empty_ids@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var response = await Client.PostAsync("/api/Download/url", content: null, cancellationToken: TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task GenerateDownloadUrl_RejectsUserWithoutAccess()
        {
            var ownerToken = await RegisterAndLoginAsync("download_owner_block", "Pass123!", "download_owner_block@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var content = new byte[16 * 1024];
            new Random(41).NextBytes(content);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "private.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, TestContext.Current.CancellationToken);

            await UploadSingleChunkAsync(file.Id, content, TestContext.Current.CancellationToken);
            await CompleteUploadAsync(file.Id, TestContext.Current.CancellationToken);

            var otherToken = await RegisterAndLoginAsync("download_other", "Pass123!", "download_other@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(otherToken);

            var response = await Client.PostAsync($"/api/Download/url?fileIds={file.Id}", content: null,
                cancellationToken: TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GenerateDownloadUrl_AllowsOwner()
        {
            var token = await RegisterAndLoginAsync("download_owner_ok", "Pass123!", "download_owner_ok@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var content = new byte[16 * 1024];
            new Random(61).NextBytes(content);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "owner.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, TestContext.Current.CancellationToken);

            await UploadSingleChunkAsync(file.Id, content, TestContext.Current.CancellationToken);
            await CompleteUploadAsync(file.Id, TestContext.Current.CancellationToken);

            var downloadUrl = await GetDownloadUrlAsync(file.Id, TestContext.Current.CancellationToken);
            downloadUrl.Should().NotBeNullOrWhiteSpace();

            using var anonymousClient = CreateAnonymousClient();
            var response = await anonymousClient.GetAsync(downloadUrl, TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task GenerateDownloadUrl_RejectsMissingFile()
        {
            var token = await RegisterAndLoginAsync("download_missing_file", "Pass123!", "download_missing_file@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var response = await Client.PostAsync("/api/Download/url?fileIds=999999", content: null,
                cancellationToken: TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task GenerateDownloadUrl_AllowsSharedUser()
        {
            var ownerToken = await RegisterAndLoginAsync("download_owner_share", "Pass123!", "download_owner_share@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var content = new byte[16 * 1024];
            new Random(53).NextBytes(content);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "shared.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, TestContext.Current.CancellationToken);

            await UploadSingleChunkAsync(file.Id, content, TestContext.Current.CancellationToken);
            await CompleteUploadAsync(file.Id, TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("download_guest", "Pass123!", "download_guest@example.com",
                TestContext.Current.CancellationToken);
            await AddShareAsync(file.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "download_guest",
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);

            var downloadUrl = await GetDownloadUrlAsync(file.Id, TestContext.Current.CancellationToken);
            downloadUrl.Should().NotBeNullOrWhiteSpace();

            using var anonymousClient = CreateAnonymousClient();
            var response = await anonymousClient.GetAsync(downloadUrl, TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task GenerateDownloadUrl_ForMultipleFiles_ReturnsArchive()
        {
            var token = await RegisterAndLoginAsync("download_multi", "Pass123!", "download_multi@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var first = await UploadFileAsync("file-0.bin", 8 * 1024, 71, TestContext.Current.CancellationToken);
            var second = await UploadFileAsync("file-1.bin", 8 * 1024, 73, TestContext.Current.CancellationToken);

            var urlResponse = await Client.PostAsync($"/api/Download/url?fileIds={first}&fileIds={second}", content: null,
                cancellationToken: TestContext.Current.CancellationToken);
            urlResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var downloadUrl = await ExtractDownloadUrlAsync(urlResponse, TestContext.Current.CancellationToken);
            downloadUrl.Should().NotBeNullOrWhiteSpace();
            downloadUrl!.Should().Contain("/api/Download/archive");

            using var anonymousClient = CreateAnonymousClient();
            var response = await anonymousClient.GetAsync(downloadUrl, TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            response.Content.Headers.ContentType!.MediaType.Should().Be("application/octet-stream");
        }

        private async Task<string?> GetDownloadUrlAsync(int fileId, CancellationToken token = default)
        {
            var urlResponse = await Client.PostAsync($"/api/Download/url?fileIds={fileId}", content: null, cancellationToken: token);
            urlResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            return await ExtractDownloadUrlAsync(urlResponse, token);
        }

        private async Task<int> UploadFileAsync(string fileName, int sizeBytes, int seed, CancellationToken token = default)
        {
            var content = new byte[sizeBytes];
            new Random(seed).NextBytes(content);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = fileName,
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, token);

            await UploadSingleChunkAsync(file.Id, content, token);
            await CompleteUploadAsync(file.Id, token);
            return file.Id;
        }

        private static async Task<string?> ExtractDownloadUrlAsync(HttpResponseMessage response, CancellationToken token = default)
        {
            var content = await response.Content.ReadAsStringAsync(token);
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