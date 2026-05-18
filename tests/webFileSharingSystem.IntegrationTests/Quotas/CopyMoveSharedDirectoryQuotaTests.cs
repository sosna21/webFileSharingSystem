using System;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.IntegrationTests.Helpers;
using webFileSharingSystem.Web.Contracts.Requests;
using webFileSharingSystem.Web.Contracts.Responses;
using Xunit;

namespace webFileSharingSystem.IntegrationTests.Quotas
{
    public class CopyMoveSharedDirectoryQuotaTests : IntegrationTestBase
    {
        public CopyMoveSharedDirectoryQuotaTests(SqlServerContainerFixture dbFixture) : base(dbFixture)
        {
        }

        [Fact]
        public async Task CopyOwnDirectory_ToSharedFolder_UpdatesTargetOwnerQuotaOnly()
        {
            var ownerToken = await RegisterAndLoginAsync("quota_shared_owner", "Pass123!", "quota_shared_owner@example.com");
            SetBearerToken(ownerToken);

            await SetUserQuotaAsync("quota_shared_owner", 2 * 1024 * 1024);

            var sharedTarget = await CreateDirectoryAsync($"shared-target-{Guid.NewGuid():N}");

            var guestToken = await RegisterAndLoginAsync("quota_shared_guest", "Pass123!", "quota_shared_guest@example.com");

            await AddShareAsync(sharedTarget.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "quota_shared_guest",
                AccessMode = ShareAccessMode.ReadWrite
            });

            SetBearerToken(guestToken);

            await SetUserQuotaAsync("quota_shared_guest", 2 * 1024 * 1024);

            var (sourceDir, totalBytes) = await CreateDirectoryWithFilesAsync($"guest-dir-{Guid.NewGuid():N}");

            var guestUsedBefore = await WaitForUserUsedSpaceAsync("quota_shared_guest", totalBytes);
            var ownerUsedBefore = await WaitForUserUsedSpaceAsync("quota_shared_owner", 0);

            await CopyAsync(sharedTarget.Id, sourceDir.Id);

            var guestUsedAfter = await WaitForUserUsedSpaceAsync("quota_shared_guest", guestUsedBefore);
            guestUsedAfter.Should().Be(guestUsedBefore);

            var ownerUsedAfter = await WaitForUserUsedSpaceAsync("quota_shared_owner", ownerUsedBefore + totalBytes);
            ownerUsedAfter.Should().Be(ownerUsedBefore + totalBytes);
        }

        [Fact]
        public async Task MoveOwnDirectory_ToSharedFolder_TransfersQuotaToTargetOwner()
        {
            var ownerToken = await RegisterAndLoginAsync("quota_shared_owner_move", "Pass123!", "quota_shared_owner_move@example.com");
            SetBearerToken(ownerToken);

            await SetUserQuotaAsync("quota_shared_owner_move", 2 * 1024 * 1024);

            var sharedTarget = await CreateDirectoryAsync($"shared-target-move-{Guid.NewGuid():N}");

            var guestToken = await RegisterAndLoginAsync("quota_shared_guest_move", "Pass123!", "quota_shared_guest_move@example.com");

            await AddShareAsync(sharedTarget.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "quota_shared_guest_move",
                AccessMode = ShareAccessMode.ReadWrite
            });

            SetBearerToken(guestToken);

            await SetUserQuotaAsync("quota_shared_guest_move", 2 * 1024 * 1024);

            var (sourceDir, totalBytes) = await CreateDirectoryWithFilesAsync($"guest-dir-move-{Guid.NewGuid():N}");

            var guestUsedBefore = await WaitForUserUsedSpaceAsync("quota_shared_guest_move", totalBytes);
            var ownerUsedBefore = await WaitForUserUsedSpaceAsync("quota_shared_owner_move", 0);

            await MoveAsync(sharedTarget.Id, sourceDir.Id);

            var guestUsedAfter = await WaitForUserUsedSpaceAsync("quota_shared_guest_move", guestUsedBefore - totalBytes);
            guestUsedAfter.Should().Be(guestUsedBefore - totalBytes);

            var ownerUsedAfter = await WaitForUserUsedSpaceAsync("quota_shared_owner_move", ownerUsedBefore + totalBytes);
            ownerUsedAfter.Should().Be(ownerUsedBefore + totalBytes);
        }

        [Fact]
        public async Task CopySharedDirectory_ToOtherSharedFolder_UpdatesTargetOwnerQuotaOnly()
        {
            var ownerAToken = await RegisterAndLoginAsync("quota_owner_a", "Pass123!", "quota_owner_a@example.com");
            SetBearerToken(ownerAToken);

            await SetUserQuotaAsync("quota_owner_a", 2 * 1024 * 1024);

            var (sourceDir, totalBytes) = await CreateDirectoryWithFilesAsync($"owner-a-dir-{Guid.NewGuid():N}");

            var guestToken = await RegisterAndLoginAsync("quota_shared_actor", "Pass123!", "quota_shared_actor@example.com");

            await AddShareAsync(sourceDir.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "quota_shared_actor",
                AccessMode = ShareAccessMode.ReadWrite
            });

            var ownerBToken = await RegisterAndLoginAsync("quota_owner_b", "Pass123!", "quota_owner_b@example.com");
            SetBearerToken(ownerBToken);

            await SetUserQuotaAsync("quota_owner_b", 2 * 1024 * 1024);

            var targetDir = await CreateDirectoryAsync($"owner-b-target-{Guid.NewGuid():N}");

            await AddShareAsync(targetDir.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "quota_shared_actor",
                AccessMode = ShareAccessMode.ReadWrite
            });

            SetBearerToken(guestToken);

            var ownerAUsedBefore = await WaitForUserUsedSpaceAsync("quota_owner_a", totalBytes);
            var ownerBUsedBefore = await WaitForUserUsedSpaceAsync("quota_owner_b", 0);

            await CopyAsync(targetDir.Id, sourceDir.Id);

            var ownerAUsedAfter = await WaitForUserUsedSpaceAsync("quota_owner_a", ownerAUsedBefore);
            ownerAUsedAfter.Should().Be(ownerAUsedBefore);

            var ownerBUsedAfter = await WaitForUserUsedSpaceAsync("quota_owner_b", ownerBUsedBefore + totalBytes);
            ownerBUsedAfter.Should().Be(ownerBUsedBefore + totalBytes);
        }

        [Fact]
        public async Task MoveSharedDirectory_ToOtherSharedFolder_TransfersQuotaBetweenOwners()
        {
            var ownerAToken = await RegisterAndLoginAsync("quota_owner_a_move", "Pass123!", "quota_owner_a_move@example.com");
            SetBearerToken(ownerAToken);

            await SetUserQuotaAsync("quota_owner_a_move", 2 * 1024 * 1024);

            var (sourceDir, totalBytes) = await CreateDirectoryWithFilesAsync($"owner-a-dir-move-{Guid.NewGuid():N}");

            var guestToken = await RegisterAndLoginAsync("quota_shared_actor_move", "Pass123!", "quota_shared_actor_move@example.com");

            await AddShareAsync(sourceDir.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "quota_shared_actor_move",
                AccessMode = ShareAccessMode.ReadWrite
            });

            var ownerBToken = await RegisterAndLoginAsync("quota_owner_b_move", "Pass123!", "quota_owner_b_move@example.com");
            SetBearerToken(ownerBToken);

            await SetUserQuotaAsync("quota_owner_b_move", 2 * 1024 * 1024);

            var targetDir = await CreateDirectoryAsync($"owner-b-target-move-{Guid.NewGuid():N}");

            await AddShareAsync(targetDir.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "quota_shared_actor_move",
                AccessMode = ShareAccessMode.ReadWrite
            });

            SetBearerToken(guestToken);

            var ownerAUsedBefore = await WaitForUserUsedSpaceAsync("quota_owner_a_move", totalBytes);
            var ownerBUsedBefore = await WaitForUserUsedSpaceAsync("quota_owner_b_move", 0);

            await MoveAsync(targetDir.Id, sourceDir.Id);

            var ownerAUsedAfter = await WaitForUserUsedSpaceAsync("quota_owner_a_move", ownerAUsedBefore - totalBytes);
            ownerAUsedAfter.Should().Be(ownerAUsedBefore - totalBytes);

            var ownerBUsedAfter = await WaitForUserUsedSpaceAsync("quota_owner_b_move", ownerBUsedBefore + totalBytes);
            ownerBUsedAfter.Should().Be(ownerBUsedBefore + totalBytes);
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
