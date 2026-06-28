using System;
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
    public class CopyMoveOwnDirectoryQuotaTests(SqlServerContainerFixture dbFixture) : IntegrationTestBase(dbFixture)
    {
        [Fact]
        public async Task CopyOwnFile_ToOwnFolder_IncreasesQuota()
        {
            var token = await RegisterAndLoginAsync("quota_copy_file", "Pass123!", "quota_copy_file@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            await SetUserQuotaAsync("quota_copy_file", 1024 * 1024, token: TestContext.Current.CancellationToken);

            var targetDir = await CreateDirectoryAsync($"copy-target-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);
            var fileSize = 64 * 1024;
            var fileId = await UploadSingleChunkAsync("copy-source.bin", fileSize, token: TestContext.Current.CancellationToken);

            var usedBefore = await WaitForUserUsedSpaceAsync("quota_copy_file", (ulong)fileSize, token: TestContext.Current.CancellationToken);

            await CopyAsync(targetDir.Id, fileId);

            var usedAfter =
                await WaitForUserUsedSpaceAsync("quota_copy_file", usedBefore + (ulong)fileSize, token: TestContext.Current.CancellationToken);
            usedAfter.Should().Be(usedBefore + (ulong)fileSize);
        }

        [Fact]
        public async Task MoveOwnFile_ToOwnFolder_DoesNotChangeQuota()
        {
            var token = await RegisterAndLoginAsync("quota_move_file", "Pass123!", "quota_move_file@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            await SetUserQuotaAsync("quota_move_file", 1024 * 1024, token: TestContext.Current.CancellationToken);

            var targetDir = await CreateDirectoryAsync($"move-target-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);
            var fileSize = 64 * 1024;
            var fileId = await UploadSingleChunkAsync("move-source.bin", fileSize, token: TestContext.Current.CancellationToken);

            var usedBefore = await WaitForUserUsedSpaceAsync("quota_move_file", (ulong)fileSize, token: TestContext.Current.CancellationToken);

            await MoveAsync(targetDir.Id, fileId);

            var usedAfter = await WaitForUserUsedSpaceAsync("quota_move_file", usedBefore, token: TestContext.Current.CancellationToken);
            usedAfter.Should().Be(usedBefore);
        }

        [Fact]
        public async Task CopyOwnDirectory_ToOwnFolder_IncreasesQuota()
        {
            var token = await RegisterAndLoginAsync("quota_copy_dir", "Pass123!", "quota_copy_dir@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            await SetUserQuotaAsync("quota_copy_dir", 2 * 1024 * 1024, token: TestContext.Current.CancellationToken);

            var (sourceDir, totalBytes) =
                await CreateDirectoryWithFilesAsync($"copy-dir-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);
            var targetDir = await CreateDirectoryAsync($"copy-dir-target-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);

            var usedBefore = await WaitForUserUsedSpaceAsync("quota_copy_dir", totalBytes, token: TestContext.Current.CancellationToken);

            await CopyAsync(targetDir.Id, sourceDir.Id);

            var usedAfter = await WaitForUserUsedSpaceAsync("quota_copy_dir", usedBefore + totalBytes, token: TestContext.Current.CancellationToken);
            usedAfter.Should().Be(usedBefore + totalBytes);
        }

        [Fact]
        public async Task MoveOwnDirectory_ToOwnFolder_DoesNotChangeQuota()
        {
            var token = await RegisterAndLoginAsync("quota_move_dir", "Pass123!", "quota_move_dir@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            await SetUserQuotaAsync("quota_move_dir", 2 * 1024 * 1024, token: TestContext.Current.CancellationToken);

            var (sourceDir, totalBytes) =
                await CreateDirectoryWithFilesAsync($"move-dir-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);
            var targetDir = await CreateDirectoryAsync($"move-dir-target-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);

            var usedBefore = await WaitForUserUsedSpaceAsync("quota_move_dir", totalBytes, token: TestContext.Current.CancellationToken);

            await MoveAsync(targetDir.Id, sourceDir.Id);

            var usedAfter = await WaitForUserUsedSpaceAsync("quota_move_dir", usedBefore, token: TestContext.Current.CancellationToken);
            usedAfter.Should().Be(usedBefore);
        }

        private async Task<int> UploadSingleChunkAsync(string fileName, int sizeBytes, int? parentId = null, CancellationToken token = default)
        {
            var content = new byte[sizeBytes];
            new Random(17).NextBytes(content);

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

        private async Task<(FileResponse Directory, ulong TotalBytes)> CreateDirectoryWithFilesAsync(string name, int? parentId = null,
            CancellationToken token = default)
        {
            var directory = await CreateDirectoryAsync(name, parentId, token);
            var childDirectory = await CreateDirectoryAsync($"{name}-child", directory.Id, token);

            var rootFileSize = 64 * 1024;
            var childFileSize = 96 * 1024;

            await UploadSingleChunkAsync($"{name}-root.bin", rootFileSize, directory.Id, token);
            await UploadSingleChunkAsync($"{name}-child.bin", childFileSize, childDirectory.Id, token);

            return (directory, (ulong)(rootFileSize + childFileSize));
        }

        private async Task CopyAsync(int targetParentId, params int[] ids)
        {
            var response = await Client.PostAsJsonAsync($"/api/File/Copy/{targetParentId}", ids);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        private async Task MoveAsync(int targetParentId, params int[] ids)
        {
            var response = await Client.PutAsJsonAsync($"/api/File/Move/{targetParentId}", ids);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        private async Task SetUserQuotaAsync(string userName, ulong quota, ulong usedSpace = 0, CancellationToken token = default)
        {
            await WithDbContextAsync(async context =>
            {
                var user = await context.ApplicationUsers.SingleAsync(u => u.UserName == userName, cancellationToken: token);
                user.Quota = quota;
                user.UsedSpace = usedSpace;
                await context.SaveChangesAsync(token);
            });
        }

        private async Task<ulong> GetUserUsedSpaceAsync(string userName, CancellationToken token = default)
        {
            ulong usedSpace = 0;
            await WithDbContextAsync(async context =>
            {
                var user = await context.ApplicationUsers.SingleAsync(u => u.UserName == userName, cancellationToken: token);
                usedSpace = user.UsedSpace;
            });

            return usedSpace;
        }


        private async Task<ulong> WaitForUserUsedSpaceAsync(string userName, ulong expectedUsedSpace, int attempts = 10, int delayMs = 200,
            CancellationToken token = default)
        {
            for (var attempt = 0; attempt < attempts; attempt++)
            {
                var usedSpace = await GetUserUsedSpaceAsync(userName, token);
                if (usedSpace == expectedUsedSpace)
                {
                    return usedSpace;
                }

                await Task.Delay(delayMs, token);
            }

            return await GetUserUsedSpaceAsync(userName, token);
        }
    }
}