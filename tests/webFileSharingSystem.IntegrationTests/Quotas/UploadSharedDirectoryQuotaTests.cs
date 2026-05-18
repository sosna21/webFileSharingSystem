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
    public class UploadSharedDirectoryQuotaTests : IntegrationTestBase
    {
        private const int UploadSizeBytes = 256 * 1024;

        public UploadSharedDirectoryQuotaTests(SqlServerContainerFixture dbFixture) : base(dbFixture)
        {
        }

        [Fact]
        public async Task UploadToSharedDirectory_FailsWhenOwnerQuotaExceeded()
        {
            var ownerToken = await RegisterAndLoginAsync("owner_quota", "Pass123!", "owner_quota@example.com");
            SetBearerToken(ownerToken);

            var directory = await CreateDirectoryAsync($"quota-{Guid.NewGuid():N}");

            var guestToken = await RegisterAndLoginAsync("guest_quota", "Pass123!", "guest_quota@example.com");

            await WithDbContextAsync(async context =>
            {
                var owner = await context.ApplicationUsers.SingleAsync(user => user.UserName == "owner_quota");
                owner.Quota = 512;
                owner.UsedSpace = 0;
                await context.SaveChangesAsync();
            });

            await AddShareAsync(directory.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "guest_quota",
                AccessMode = ShareAccessMode.ReadWrite
            });
            SetBearerToken(guestToken);

            var response = await Client.PostAsJsonAsync("/api/Upload/Start", new UploadFileInfoRequest
            {
                FileName = "too-large.bin",
                Size = 1024,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream",
                ParentId = directory.Id
            });

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var errors = await response.Content.ReadFromJsonAsync<string[]>();
            errors.Should().NotBeNull();
            errors!.FirstOrDefault().Should().Contain("Folder owner do not have enough free space");
        }

        [Fact]
        public async Task UploadToSharedDirectory_SucceedsWhenOwnerHasQuota()
        {
            var ownerToken = await RegisterAndLoginAsync("owner_quota_ok", "Pass123!", "owner_quota_ok@example.com");
            SetBearerToken(ownerToken);

            var directory = await CreateDirectoryAsync($"quota-ok-{Guid.NewGuid():N}");

            var guestToken = await RegisterAndLoginAsync("guest_quota_ok", "Pass123!", "guest_quota_ok@example.com");

            await WithDbContextAsync(async context =>
            {
                var owner = await context.ApplicationUsers.SingleAsync(user => user.UserName == "owner_quota_ok");
                owner.Quota = (ulong)UploadSizeBytes + 1024;
                owner.UsedSpace = 0;
                await context.SaveChangesAsync();
            });

            await AddShareAsync(directory.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "guest_quota_ok",
                AccessMode = ShareAccessMode.ReadWrite
            });
            SetBearerToken(guestToken);

            var fileId = await UploadSingleChunkAsync("quota-ok.bin", UploadSizeBytes, parentId: directory.Id);
            var list = await GetSharedWithMeAsync(directory.Id);
            list.Items.Should().Contain(item => item.Id == fileId);
        }

        private async Task<int> UploadSingleChunkAsync(string fileName, int sizeBytes, int? parentId = null)
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
            });

            await UploadSingleChunkAsync(startResponse.Id, content);
            await CompleteUploadAsync(startResponse.Id);
            return startResponse.Id;
        }

        private async Task<PaginatedListResponse<SharedFileResponse>> GetSharedWithMeAsync(int? parentId = null)
        {
            var url = parentId.HasValue
                ? $"/api/File/GetSharedWithMe?PageNumber=1&PageSize=50&ParentId={parentId.Value}"
                : "/api/File/GetSharedWithMe?PageNumber=1&PageSize=50";

            var listResponse = await Client.GetAsync(url);
            listResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var list = await listResponse.Content.ReadFromJsonAsync<PaginatedListResponse<SharedFileResponse>>();
            list.Should().NotBeNull();
            return list!;
        }

        private sealed class PaginatedListResponse<T>
        {
            public T[] Items { get; set; } = Array.Empty<T>();
        }
    }
}
