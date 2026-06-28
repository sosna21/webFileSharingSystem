using System;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.IntegrationTests.Helpers;
using webFileSharingSystem.Web.Contracts.Requests;
using webFileSharingSystem.Web.Contracts.Responses;
using Xunit;

namespace webFileSharingSystem.IntegrationTests.Files
{
    public class FilePathTests(SqlServerContainerFixture dbFixture) : IntegrationTestBase(dbFixture)
    {
        [Fact]
        public async Task GetFilePath_ForOwnFile_ReturnsPathParts()
        {
            var token = await RegisterAndLoginAsync("file_path_owner", "Pass123!", "file_path_owner@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var parent = await CreateDirectoryAsync("alpha", token: TestContext.Current.CancellationToken);
            var child = await CreateDirectoryAsync("beta", parent.Id, TestContext.Current.CancellationToken);
            var fileId = await UploadCompletedFileAsync("gamma.txt", child.Id, TestContext.Current.CancellationToken);

            var response = await Client.GetAsync($"/api/File/GetFilePath/{fileId}", TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var path = await response.Content.ReadFromJsonAsync<FilePathPartResponse[]>(cancellationToken: TestContext.Current.CancellationToken);
            path.Should().NotBeNull();
            path!.Select(part => part.FileName).Should().Contain(new[] { "alpha", "beta", "gamma.txt" });
            path.Select(part => part.Level).Distinct().Count().Should().Be(path.Length);
        }

        [Fact]
        public async Task GetFilePath_ForSharedFile_ContainsAccessMode()
        {
            var ownerToken = await RegisterAndLoginAsync("file_path_owner_shared", "Pass123!",
                "file_path_owner_shared@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var fileId = await UploadCompletedFileAsync("shared.txt", token: TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("file_path_guest", "Pass123!", "file_path_guest@example.com",
                TestContext.Current.CancellationToken);

            await AddShareAsync(fileId, new AddFileShareRequest
            {
                UserNameToShareWith = "file_path_guest",
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);

            var response = await Client.GetAsync($"/api/File/GetFilePath/{fileId}", TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var path = await response.Content.ReadFromJsonAsync<FilePathPartResponse[]>(cancellationToken: TestContext.Current.CancellationToken);
            path.Should().NotBeNull();
            path!.Should().Contain(part => part.AccessMode == ShareAccessMode.ReadOnly);
            path!.Select(part => part.FileName).Should().Contain("shared.txt");
        }

        private async Task<int> UploadCompletedFileAsync(string fileName, int? parentId = null, CancellationToken token = default)
        {
            var content = new byte[8 * 1024];
            new Random(19).NextBytes(content);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = fileName,
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream",
                ParentId = parentId
            }, token);

            await UploadSingleChunkAsync(file.Id, content, token);
            await CompleteUploadAsync(file.Id, token);

            return file.Id;
        }
    }
}