using System;
using System.Net;
using System.Net.Http.Json;
using System.Threading;
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
    public class CopyMoveSharedDirectoryQuotaTests(SqlServerContainerFixture dbFixture) : IntegrationTestBase(dbFixture)
    {
        [Fact]
        public async Task CopyOwnDirectory_ToSharedFolder_UpdatesTargetOwnerQuotaOnly()
        {
            var ownerToken = await RegisterAndLoginAsync("quota_shared_owner", "Pass123!", "quota_shared_owner@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            await SetUserQuotaAsync("quota_shared_owner", 2 * 1024 * 1024, token: TestContext.Current.CancellationToken);

            var sharedTarget = await CreateDirectoryAsync($"shared-target-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("quota_shared_guest", "Pass123!", "quota_shared_guest@example.com",
                TestContext.Current.CancellationToken);

            await AddShareAsync(sharedTarget.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "quota_shared_guest",
                AccessMode = ShareAccessMode.ReadWrite
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);

            await SetUserQuotaAsync("quota_shared_guest", 2 * 1024 * 1024, token: TestContext.Current.CancellationToken);

            var (sourceDir, totalBytes) =
                await CreateDirectoryWithFilesAsync($"guest-dir-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);

            var guestUsedBefore = await WaitForUserUsedSpaceAsync("quota_shared_guest", totalBytes, token: TestContext.Current.CancellationToken);
            var ownerUsedBefore = await WaitForUserUsedSpaceAsync("quota_shared_owner", 0, token: TestContext.Current.CancellationToken);

            await CopyAsync(sharedTarget.Id, sourceDir.Id);

            var guestUsedAfter = await WaitForUserUsedSpaceAsync("quota_shared_guest", guestUsedBefore, token: TestContext.Current.CancellationToken);
            guestUsedAfter.Should().Be(guestUsedBefore);

            var ownerUsedAfter = await WaitForUserUsedSpaceAsync("quota_shared_owner", ownerUsedBefore + totalBytes,
                token: TestContext.Current.CancellationToken);
            ownerUsedAfter.Should().Be(ownerUsedBefore + totalBytes);
        }

        [Fact]
        public async Task MoveOwnDirectory_ToSharedFolder_TransfersQuotaToTargetOwner()
        {
            var ownerToken = await RegisterAndLoginAsync("quota_shared_owner_move", "Pass123!", "quota_shared_owner_move@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            await SetUserQuotaAsync("quota_shared_owner_move", 2 * 1024 * 1024, token: TestContext.Current.CancellationToken);

            var sharedTarget = await CreateDirectoryAsync($"shared-target-move-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("quota_shared_guest_move", "Pass123!", "quota_shared_guest_move@example.com",
                TestContext.Current.CancellationToken);

            await AddShareAsync(sharedTarget.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "quota_shared_guest_move",
                AccessMode = ShareAccessMode.ReadWrite
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);

            await SetUserQuotaAsync("quota_shared_guest_move", 2 * 1024 * 1024, token: TestContext.Current.CancellationToken);

            var (sourceDir, totalBytes) =
                await CreateDirectoryWithFilesAsync($"guest-dir-move-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);

            var guestUsedBefore =
                await WaitForUserUsedSpaceAsync("quota_shared_guest_move", totalBytes, token: TestContext.Current.CancellationToken);
            var ownerUsedBefore = await WaitForUserUsedSpaceAsync("quota_shared_owner_move", 0, token: TestContext.Current.CancellationToken);

            await MoveAsync(sharedTarget.Id, sourceDir.Id);

            var guestUsedAfter = await WaitForUserUsedSpaceAsync("quota_shared_guest_move", guestUsedBefore - totalBytes,
                token: TestContext.Current.CancellationToken);
            guestUsedAfter.Should().Be(guestUsedBefore - totalBytes);

            var ownerUsedAfter = await WaitForUserUsedSpaceAsync("quota_shared_owner_move", ownerUsedBefore + totalBytes,
                token: TestContext.Current.CancellationToken);
            ownerUsedAfter.Should().Be(ownerUsedBefore + totalBytes);
        }

        [Fact]
        public async Task CopySharedDirectory_ToOtherSharedFolder_UpdatesTargetOwnerQuotaOnly()
        {
            var ownerAToken =
                await RegisterAndLoginAsync("quota_owner_a", "Pass123!", "quota_owner_a@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(ownerAToken);

            await SetUserQuotaAsync("quota_owner_a", 2 * 1024 * 1024, token: TestContext.Current.CancellationToken);

            var (sourceDir, totalBytes) =
                await CreateDirectoryWithFilesAsync($"owner-a-dir-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("quota_shared_actor", "Pass123!", "quota_shared_actor@example.com",
                TestContext.Current.CancellationToken);

            await AddShareAsync(sourceDir.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "quota_shared_actor",
                AccessMode = ShareAccessMode.ReadWrite
            }, TestContext.Current.CancellationToken);

            var ownerBToken =
                await RegisterAndLoginAsync("quota_owner_b", "Pass123!", "quota_owner_b@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(ownerBToken);

            await SetUserQuotaAsync("quota_owner_b", 2 * 1024 * 1024, token: TestContext.Current.CancellationToken);

            var targetDir = await CreateDirectoryAsync($"owner-b-target-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);

            await AddShareAsync(targetDir.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "quota_shared_actor",
                AccessMode = ShareAccessMode.ReadWrite
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);

            var ownerAUsedBefore = await WaitForUserUsedSpaceAsync("quota_owner_a", totalBytes, token: TestContext.Current.CancellationToken);
            var ownerBUsedBefore = await WaitForUserUsedSpaceAsync("quota_owner_b", 0, token: TestContext.Current.CancellationToken);

            await CopyAsync(targetDir.Id, sourceDir.Id);

            var ownerAUsedAfter = await WaitForUserUsedSpaceAsync("quota_owner_a", ownerAUsedBefore, token: TestContext.Current.CancellationToken);
            ownerAUsedAfter.Should().Be(ownerAUsedBefore);

            var ownerBUsedAfter =
                await WaitForUserUsedSpaceAsync("quota_owner_b", ownerBUsedBefore + totalBytes, token: TestContext.Current.CancellationToken);
            ownerBUsedAfter.Should().Be(ownerBUsedBefore + totalBytes);
        }

        [Fact]
        public async Task MoveSharedDirectory_ToOtherSharedFolder_TransfersQuotaBetweenOwners()
        {
            var ownerAToken = await RegisterAndLoginAsync("quota_owner_a_move", "Pass123!", "quota_owner_a_move@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerAToken);

            await SetUserQuotaAsync("quota_owner_a_move", 2 * 1024 * 1024, token: TestContext.Current.CancellationToken);

            var (sourceDir, totalBytes) =
                await CreateDirectoryWithFilesAsync($"owner-a-dir-move-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("quota_shared_actor_move", "Pass123!", "quota_shared_actor_move@example.com",
                TestContext.Current.CancellationToken);

            await AddShareAsync(sourceDir.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "quota_shared_actor_move",
                AccessMode = ShareAccessMode.ReadWrite
            }, TestContext.Current.CancellationToken);

            var ownerBToken = await RegisterAndLoginAsync("quota_owner_b_move", "Pass123!", "quota_owner_b_move@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerBToken);

            await SetUserQuotaAsync("quota_owner_b_move", 2 * 1024 * 1024, token: TestContext.Current.CancellationToken);

            var targetDir = await CreateDirectoryAsync($"owner-b-target-move-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);

            await AddShareAsync(targetDir.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "quota_shared_actor_move",
                AccessMode = ShareAccessMode.ReadWrite
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);

            var ownerAUsedBefore = await WaitForUserUsedSpaceAsync("quota_owner_a_move", totalBytes, token: TestContext.Current.CancellationToken);
            var ownerBUsedBefore = await WaitForUserUsedSpaceAsync("quota_owner_b_move", 0, token: TestContext.Current.CancellationToken);

            await MoveAsync(targetDir.Id, sourceDir.Id);

            var ownerAUsedAfter = await WaitForUserUsedSpaceAsync("quota_owner_a_move", ownerAUsedBefore - totalBytes,
                token: TestContext.Current.CancellationToken);
            ownerAUsedAfter.Should().Be(ownerAUsedBefore - totalBytes);

            var ownerBUsedAfter = await WaitForUserUsedSpaceAsync("quota_owner_b_move", ownerBUsedBefore + totalBytes,
                token: TestContext.Current.CancellationToken);
            ownerBUsedAfter.Should().Be(ownerBUsedBefore + totalBytes);
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