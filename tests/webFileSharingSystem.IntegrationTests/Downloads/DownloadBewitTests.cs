using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.WebUtilities;
using webFileSharingSystem.IntegrationTests.Helpers;
using webFileSharingSystem.Web.Contracts.Requests;
using Xunit;

namespace webFileSharingSystem.IntegrationTests.Downloads
{
    public class DownloadBewitTests(SqlServerContainerFixture dbFixture) : IntegrationTestBase(dbFixture)
    {
        [Fact]
        public async Task DownloadBewit_AllowsAccess()
        {
            var token = await RegisterAndLoginAsync("download_bewit_ok", "Pass123!", "download_bewit_ok@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var content = new byte[64 * 1024];
            new Random(7).NextBytes(content);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "bewit-ok.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, TestContext.Current.CancellationToken);

            await UploadSingleChunkAsync(file.Id, content, TestContext.Current.CancellationToken);
            await CompleteUploadAsync(file.Id, TestContext.Current.CancellationToken);

            var downloadUrl = await GetDownloadUrlAsync(file.Id, TestContext.Current.CancellationToken);
            downloadUrl.Should().NotBeNullOrWhiteSpace();

            using var anonymousClient = CreateAnonymousClient();
            var downloadResponse = await anonymousClient.GetAsync(downloadUrl, TestContext.Current.CancellationToken);
            downloadResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            downloadResponse.Content.Headers.ContentType!.MediaType.Should().Be("application/octet-stream");
        }

        [Fact]
        public async Task DownloadBewit_RejectsMissingBewit()
        {
            var token = await RegisterAndLoginAsync("download_bewit_missing", "Pass123!", "download_bewit_missing@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var content = new byte[32 * 1024];
            new Random(11).NextBytes(content);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "bewit-missing.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, TestContext.Current.CancellationToken);

            await UploadSingleChunkAsync(file.Id, content, TestContext.Current.CancellationToken);
            await CompleteUploadAsync(file.Id, TestContext.Current.CancellationToken);

            var downloadUrl = await GetDownloadUrlAsync(file.Id, TestContext.Current.CancellationToken);
            downloadUrl.Should().NotBeNullOrWhiteSpace();

            using var anonymousClient = CreateAnonymousClient();
            var urlWithoutBewit = RemoveQueryParameter(downloadUrl!, "bewit");
            var missingBewitResponse = await anonymousClient.GetAsync(urlWithoutBewit, TestContext.Current.CancellationToken);
            missingBewitResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task DownloadBewit_RejectsTamperedBewit()
        {
            var token = await RegisterAndLoginAsync("download_bewit_tamper", "Pass123!", "download_bewit_tamper@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var content = new byte[32 * 1024];
            new Random(13).NextBytes(content);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "bewit-tamper.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, TestContext.Current.CancellationToken);

            await UploadSingleChunkAsync(file.Id, content, TestContext.Current.CancellationToken);
            await CompleteUploadAsync(file.Id, TestContext.Current.CancellationToken);

            var downloadUrl = await GetDownloadUrlAsync(file.Id, TestContext.Current.CancellationToken);
            downloadUrl.Should().NotBeNullOrWhiteSpace();

            using var anonymousClient = CreateAnonymousClient();
            var tamperedUrl = ReplaceQueryParameter(downloadUrl!, "bewit", "tampered");
            var response = await anonymousClient.GetAsync(tamperedUrl, TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task DownloadBewit_RejectsMissingToken()
        {
            var token = await RegisterAndLoginAsync("download_bewit_no_token", "Pass123!", "download_bewit_no_token@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var content = new byte[32 * 1024];
            new Random(17).NextBytes(content);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "bewit-no-token.bin",
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, TestContext.Current.CancellationToken);

            await UploadSingleChunkAsync(file.Id, content, TestContext.Current.CancellationToken);
            await CompleteUploadAsync(file.Id, TestContext.Current.CancellationToken);

            var downloadUrl = await GetDownloadUrlAsync(file.Id, TestContext.Current.CancellationToken);
            downloadUrl.Should().NotBeNullOrWhiteSpace();

            using var anonymousClient = CreateAnonymousClient();
            var urlWithoutToken = RemoveQueryParameter(downloadUrl!, "token");
            var response = await anonymousClient.GetAsync(urlWithoutToken, TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

            var urlWithoutBewit = RemoveQueryParameter(downloadUrl!, "bewit");
            var missingBewitResponse = await anonymousClient.GetAsync(urlWithoutBewit, TestContext.Current.CancellationToken);
            missingBewitResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task DownloadBewit_ReturnsOriginalFileContent()
        {
            var token = await RegisterAndLoginAsync("download_bewit_content", "Pass123!", "download_bewit_content@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var content = new byte[48 * 1024];
            new Random(23).NextBytes(content);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "bewit-content.bin",
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

            var downloadedBytes = await response.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken);
            downloadedBytes.Should().Equal(content);
        }

        private async Task<string?> GetDownloadUrlAsync(int fileId, CancellationToken token = default)
        {
            var urlResponse = await Client.PostAsync($"/api/Download/url?fileIds={fileId}", content: null, cancellationToken: token);
            urlResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            return await ExtractDownloadUrlAsync(urlResponse, token);
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

        private static string RemoveQueryParameter(string url, string key)
        {
            var uri = new Uri(url);
            var query = QueryHelpers.ParseQuery(uri.Query);
            query.Remove(key);

            var builder = new UriBuilder(uri)
            {
                Query = string.Join("&", query.SelectMany(pair => pair.Value.Select(value => $"{pair.Key}={value}")))
            };

            return builder.Uri.ToString();
        }

        private static string ReplaceQueryParameter(string url, string key, string value)
        {
            var uri = new Uri(url);
            var query = QueryHelpers.ParseQuery(uri.Query);
            query[key] = value;

            var builder = new UriBuilder(uri)
            {
                Query = string.Join("&", query.SelectMany(pair => pair.Value.Select(v => $"{pair.Key}={v}")))
            };

            return builder.Uri.ToString();
        }

        private sealed class DownloadUrlResponse
        {
            public string Url { get; set; } = string.Empty;
        }
    }
}