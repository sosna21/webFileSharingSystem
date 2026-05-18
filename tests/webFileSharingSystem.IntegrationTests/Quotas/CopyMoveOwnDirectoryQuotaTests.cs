using System;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using webFileSharingSystem.IntegrationTests.Helpers;
using webFileSharingSystem.Web.Contracts.Requests;
using webFileSharingSystem.Web.Contracts.Responses;
using Xunit;

namespace webFileSharingSystem.IntegrationTests.Quotas
{
    public class CopyMoveOwnDirectoryQuotaTests : IntegrationTestBase
    {
        public CopyMoveOwnDirectoryQuotaTests(SqlServerContainerFixture dbFixture) : base(dbFixture)
        {
        }

        [Fact]
        public async Task CopyOwnFile_ToOwnFolder_IncreasesQuota()
        {
            var token = await RegisterAndLoginAsync("quota_copy_file", "Pass123!", "quota_copy_file@example.com");
            SetBearerToken(token);

            await SetUserQuotaAsync("quota_copy_file", 1024 * 1024);

            var targetDir = await CreateDirectoryAsync($"copy-target-{Guid.NewGuid():N}");
            var fileSize = 64 * 1024;
            var fileId = await UploadSingleChunkAsync("copy-source.bin", fileSize);

            var usedBefore = await WaitForUserUsedSpaceAsync("quota_copy_file", (ulong)fileSize);

            await CopyAsync(targetDir.Id, fileId);

            var usedAfter = await WaitForUserUsedSpaceAsync("quota_copy_file", usedBefore + (ulong)fileSize);
            usedAfter.Should().Be(usedBefore + (ulong)fileSize);
        }

        [Fact]
        public async Task MoveOwnFile_ToOwnFolder_DoesNotChangeQuota()
        {
            var token = await RegisterAndLoginAsync("quota_move_file", "Pass123!", "quota_move_file@example.com");
            SetBearerToken(token);

            await SetUserQuotaAsync("quota_move_file", 1024 * 1024);

            var targetDir = await CreateDirectoryAsync($"move-target-{Guid.NewGuid():N}");
            var fileSize = 64 * 1024;
            var fileId = await UploadSingleChunkAsync("move-source.bin", fileSize);

            var usedBefore = await WaitForUserUsedSpaceAsync("quota_move_file", (ulong)fileSize);

            await MoveAsync(targetDir.Id, fileId);

            var usedAfter = await WaitForUserUsedSpaceAsync("quota_move_file", usedBefore);
            usedAfter.Should().Be(usedBefore);
        }

        [Fact]
        public async Task CopyOwnDirectory_ToOwnFolder_IncreasesQuota()
        {
            var token = await RegisterAndLoginAsync("quota_copy_dir", "Pass123!", "quota_copy_dir@example.com");
            SetBearerToken(token);

            await SetUserQuotaAsync("quota_copy_dir", 2 * 1024 * 1024);

            var (sourceDir, totalBytes) = await CreateDirectoryWithFilesAsync($"copy-dir-{Guid.NewGuid():N}");
            var targetDir = await CreateDirectoryAsync($"copy-dir-target-{Guid.NewGuid():N}");

            var usedBefore = await WaitForUserUsedSpaceAsync("quota_copy_dir", totalBytes);

            await CopyAsync(targetDir.Id, sourceDir.Id);

            var usedAfter = await WaitForUserUsedSpaceAsync("quota_copy_dir", usedBefore + totalBytes);
            usedAfter.Should().Be(usedBefore + totalBytes);
        }

        [Fact]
        public async Task MoveOwnDirectory_ToOwnFolder_DoesNotChangeQuota()
        {
            var token = await RegisterAndLoginAsync("quota_move_dir", "Pass123!", "quota_move_dir@example.com");
            SetBearerToken(token);

            await SetUserQuotaAsync("quota_move_dir", 2 * 1024 * 1024);

            var (sourceDir, totalBytes) = await CreateDirectoryWithFilesAsync($"move-dir-{Guid.NewGuid():N}");
            var targetDir = await CreateDirectoryAsync($"move-dir-target-{Guid.NewGuid():N}");

            var usedBefore = await WaitForUserUsedSpaceAsync("quota_move_dir", totalBytes);

            await MoveAsync(targetDir.Id, sourceDir.Id);

            var usedAfter = await WaitForUserUsedSpaceAsync("quota_move_dir", usedBefore);
            usedAfter.Should().Be(usedBefore);
        }

        private async Task<int> UploadSingleChunkAsync(string fileName, int sizeBytes, int? parentId = null)
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
            });

            await UploadSingleChunkAsync(startResponse.Id, content);
            await CompleteUploadAsync(startResponse.Id);
            return startResponse.Id;
        }

        private async Task<(FileResponse Directory, ulong TotalBytes)> CreateDirectoryWithFilesAsync(string name, int? parentId = null)
        {
            var directory = await CreateDirectoryAsync(name, parentId);
            var childDirectory = await CreateDirectoryAsync($"{name}-child", directory.Id);

            var rootFileSize = 64 * 1024;
            var childFileSize = 96 * 1024;

            await UploadSingleChunkAsync($"{name}-root.bin", rootFileSize, directory.Id);
            await UploadSingleChunkAsync($"{name}-child.bin", childFileSize, childDirectory.Id);

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

        private async Task SetUserQuotaAsync(string userName, ulong quota, ulong usedSpace = 0)
        {
            await WithDbContextAsync(async context =>
            {
                var user = await context.ApplicationUsers.SingleAsync(u => u.UserName == userName);
                user.Quota = quota;
                user.UsedSpace = usedSpace;
                await context.SaveChangesAsync();
            });
        }

        private async Task<ulong> GetUserUsedSpaceAsync(string userName)
        {
            ulong usedSpace = 0;
            await WithDbContextAsync(async context =>
            {
                var user = await context.ApplicationUsers.SingleAsync(u => u.UserName == userName);
                usedSpace = user.UsedSpace;
            });

            return usedSpace;
        }


        private async Task<ulong> WaitForUserUsedSpaceAsync(string userName, ulong expectedUsedSpace, int attempts = 10, int delayMs = 200)
        {
            for (var attempt = 0; attempt < attempts; attempt++)
            {
                var usedSpace = await GetUserUsedSpaceAsync(userName);
                if (usedSpace == expectedUsedSpace)
                {
                    return usedSpace;
                }

                await Task.Delay(delayMs);
            }

            return await GetUserUsedSpaceAsync(userName);
        }
    }
}
