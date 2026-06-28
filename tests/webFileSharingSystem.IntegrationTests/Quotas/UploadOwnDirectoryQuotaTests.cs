using System;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using webFileSharingSystem.IntegrationTests.Helpers;
using webFileSharingSystem.Web.Contracts.Requests;
using webFileSharingSystem.Web.Contracts.Responses;
using Xunit;

namespace webFileSharingSystem.IntegrationTests.Quotas
{
    public class UploadOwnDirectoryQuotaTests(SqlServerContainerFixture dbFixture) : IntegrationTestBase(dbFixture)
    {
        private const int UploadSizeBytes = 256 * 1024;

        [Fact]
        public async Task UploadToOwnRoot_FailsWhenUserQuotaExceeded()
        {
            var token = await RegisterAndLoginAsync("owner_quota_self", "Pass123!", "owner_quota_self@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            await WithDbContextAsync(async context =>
            {
                var user = await context.ApplicationUsers.SingleAsync(u => u.UserName == "owner_quota_self");
                user.Quota = 512;
                user.UsedSpace = 0;
                await context.SaveChangesAsync();
            });

            var response = await Client.PostAsJsonAsync("/api/Upload/Start", new UploadFileInfoRequest
            {
                FileName = "too-large-self.bin",
                Size = UploadSizeBytes,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var errors = await response.Content.ReadFromJsonAsync<string[]>(cancellationToken: TestContext.Current.CancellationToken);
            errors.Should().NotBeNull();
            errors!.FirstOrDefault().Should().Contain("You do not have enough free space");
        }

        [Fact]
        public async Task UploadToOwnRoot_UpdatesUsedSpace_AndDeleteRefunds()
        {
            var token = await RegisterAndLoginAsync("owner_quota_usage", "Pass123!", "owner_quota_usage@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            await WithDbContextAsync(async context =>
            {
                var user = await context.ApplicationUsers.SingleAsync(u => u.UserName == "owner_quota_usage");
                user.Quota = (ulong)UploadSizeBytes + 1024;
                user.UsedSpace = 0;
                await context.SaveChangesAsync();
            });

            var fileId = await UploadSingleChunkAsync("usage.bin", UploadSizeBytes, token: TestContext.Current.CancellationToken);

            var afterUpload = await GetMeAsync(TestContext.Current.CancellationToken);
            afterUpload.UsedSpace.Should().BeGreaterThan(0);

            var deleteResponse = await Client.DeleteAsync($"/api/File/Delete/{fileId}", TestContext.Current.CancellationToken);
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var afterDelete = await GetMeAsync(TestContext.Current.CancellationToken);
            afterDelete.UsedSpace.Should().Be(0);
        }

        [Fact]
        public async Task DeleteDirectory_RefundsQuota_ForNestedContent()
        {
            var token = await RegisterAndLoginAsync("owner_quota_dir_delete", "Pass123!", "owner_quota_dir_delete@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var rootDir = await CreateDirectoryAsync($"quota-delete-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);
            var childDir = await CreateDirectoryAsync($"quota-delete-child-{Guid.NewGuid():N}", rootDir.Id, TestContext.Current.CancellationToken);
            var grandChildDir =
                await CreateDirectoryAsync($"quota-delete-grand-{Guid.NewGuid():N}", childDir.Id, TestContext.Current.CancellationToken);

            var rootSize = 64 * 1024;
            var childSize = 96 * 1024;
            var grandChildSize = 128 * 1024;
            var totalBytes = (ulong)(rootSize + childSize + grandChildSize);

            await WithDbContextAsync(async context =>
            {
                var user = await context.ApplicationUsers.SingleAsync(u => u.UserName == "owner_quota_dir_delete");
                user.Quota = totalBytes + 1024;
                user.UsedSpace = 0;
                await context.SaveChangesAsync();
            });

            await UploadSingleChunkAsync("root.bin", rootSize, rootDir.Id, TestContext.Current.CancellationToken);
            await UploadSingleChunkAsync("child.bin", childSize, childDir.Id, TestContext.Current.CancellationToken);
            await UploadSingleChunkAsync("grand.bin", grandChildSize, grandChildDir.Id, TestContext.Current.CancellationToken);

            var afterUpload = await WaitForUsedSpaceAsync(totalBytes, token: TestContext.Current.CancellationToken);
            afterUpload.UsedSpace.Should().Be(totalBytes);

            var deleteResponse = await Client.DeleteAsync($"/api/File/Delete/{rootDir.Id}", TestContext.Current.CancellationToken);
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var afterDelete = await WaitForUsedSpaceAsync(0, token: TestContext.Current.CancellationToken);
            afterDelete.UsedSpace.Should().Be(0);
        }

        [Fact]
        public async Task UploadsToSameDirectory_ConsumeQuotaAcrossConcurrentUploads()
        {
            var token = await RegisterAndLoginAsync("owner_quota_parallel", "Pass123!", "owner_quota_parallel@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var directory = await CreateDirectoryAsync($"quota-parallel-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);

            var uploadCount = 3;
            var sizePerFile = 64 * 1024;
            var totalBytes = (ulong)(uploadCount * sizePerFile);

            await WithDbContextAsync(async context =>
            {
                var user = await context.ApplicationUsers.SingleAsync(u => u.UserName == "owner_quota_parallel");
                user.Quota = totalBytes + 1024;
                user.UsedSpace = 0;
                await context.SaveChangesAsync();
            });

            var uploadTasks = Enumerable.Range(0, uploadCount)
                .Select(index => UploadSingleChunkAsync($"parallel-{index}.bin", sizePerFile, directory.Id))
                .ToArray();

            var fileIds = await Task.WhenAll(uploadTasks);
            fileIds.Length.Should().Be(uploadCount);

            var afterUpload = await WaitForUsedSpaceAsync(totalBytes, token: TestContext.Current.CancellationToken);
            afterUpload.UsedSpace.Should().Be(totalBytes);
        }

        private async Task<int> UploadSingleChunkAsync(string fileName, int sizeBytes, int? parentId = null, CancellationToken token = default)
        {
            var content = new byte[sizeBytes];
            new Random(11).NextBytes(content);

            var startResponse = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = fileName,
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream",
                ParentId = parentId
            }, token);

            await UploadSingleChunkAsync(startResponse.Id, content, token);
            await CompleteUploadAsync(startResponse.Id, token);
            return startResponse.Id;
        }

        private async Task<AppUserResponse> GetMeAsync(CancellationToken token = default)
        {
            var response = await Client.GetAsync("/api/User/Me", token);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var user = await response.Content.ReadFromJsonAsync<AppUserResponse>(cancellationToken: token);
            user.Should().NotBeNull();
            return user!;
        }

        private async Task<AppUserResponse> WaitForUsedSpaceAsync(ulong expectedUsedSpace, int attempts = 10, int delayMs = 200,
            CancellationToken token = default)
        {
            for (var attempt = 0; attempt < attempts; attempt++)
            {
                var user = await GetMeAsync(token);
                if (user.UsedSpace == expectedUsedSpace)
                {
                    return user;
                }

                await Task.Delay(delayMs, token);
            }

            return await GetMeAsync(token);
        }
    }
}