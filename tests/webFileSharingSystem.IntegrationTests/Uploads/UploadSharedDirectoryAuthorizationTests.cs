using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.IntegrationTests.Helpers;
using webFileSharingSystem.Web.Contracts.Requests;
using webFileSharingSystem.Web.Contracts.Responses;
using Xunit;

namespace webFileSharingSystem.IntegrationTests.Uploads
{
    public class UploadSharedDirectoryAuthorizationTests(SqlServerContainerFixture dbFixture) : IntegrationTestBase(dbFixture)
    {
        [Fact]
        public async Task UploadToSharedDirectory_RequiresReadWriteAccess()
        {
            var ownerToken =
                await RegisterAndLoginAsync("owner_upload", "Pass123!", "owner_upload@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var directory = await CreateDirectoryAsync($"shared-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);

            var guestToken =
                await RegisterAndLoginAsync("guest_upload", "Pass123!", "guest_upload@example.com", TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);
            var unauthorizedResponse = await StartUploadAsGuestAsync(directory.Id, TestContext.Current.CancellationToken);
            unauthorizedResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

            SetBearerToken(ownerToken);
            var share = await AddShareAsync(directory.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "guest_upload",
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);
            var readOnlyResponse = await StartUploadAsGuestAsync(directory.Id, TestContext.Current.CancellationToken);
            readOnlyResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

            SetBearerToken(ownerToken);
            await UpdateShareAsync(share.ShareId, new UpdateFileShareRequest
            {
                AccessMode = ShareAccessMode.ReadWrite
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);
            var readWriteResponse = await StartUploadAsGuestAsync(directory.Id, TestContext.Current.CancellationToken);
            readWriteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var sharedFile =
                await readWriteResponse.Content.ReadFromJsonAsync<SharedFileResponse>(cancellationToken: TestContext.Current.CancellationToken);
            sharedFile.Should().NotBeNull();
            sharedFile!.ParentId.Should().Be(directory.Id);
            sharedFile.AccessMode.Should().Be(ShareAccessMode.ReadWrite);

            SetBearerToken(ownerToken);
            await DeleteShareAsync(share.ShareId, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);
            var revokedResponse = await StartUploadAsGuestAsync(directory.Id, TestContext.Current.CancellationToken);
            revokedResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task UploadToSharedDirectory_AllowsFullAccess()
        {
            var ownerToken = await RegisterAndLoginAsync("owner_upload_full", "Pass123!", "owner_upload_full@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var directory = await CreateDirectoryAsync($"shared-full-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("guest_upload_full", "Pass123!", "guest_upload_full@example.com",
                TestContext.Current.CancellationToken);

            var share = await AddShareAsync(directory.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "guest_upload_full",
                AccessMode = ShareAccessMode.FullAccess
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);
            var response = await StartUploadAsGuestAsync(directory.Id, TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var sharedFile = await response.Content.ReadFromJsonAsync<SharedFileResponse>(cancellationToken: TestContext.Current.CancellationToken);
            sharedFile.Should().NotBeNull();
            sharedFile!.ParentId.Should().Be(directory.Id);
            sharedFile.AccessMode.Should().Be(ShareAccessMode.FullAccess);

            SetBearerToken(ownerToken);
            await DeleteShareAsync(share.ShareId, TestContext.Current.CancellationToken);
        }

        [Fact]
        public async Task UploadToSharedDirectory_FailsWhenShareRevokedByFileId()
        {
            var ownerToken = await RegisterAndLoginAsync("owner_upload_exp", "Pass123!", "owner_upload_exp@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var directory = await CreateDirectoryAsync($"shared-exp-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("guest_upload_exp", "Pass123!", "guest_upload_exp@example.com",
                TestContext.Current.CancellationToken);

            await AddShareAsync(directory.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "guest_upload_exp",
                AccessMode = ShareAccessMode.FullAccess,
                ShareValidTo = DateTime.UtcNow.AddMinutes(5)
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);
            var revokeResponse = await Client.DeleteAsync($"/api/Share/RemoveShare/{directory.Id}", TestContext.Current.CancellationToken);
            revokeResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await StartUploadAsGuestAsync(directory.Id, TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task UploadToNestedDirectory_UsesExplicitChildShare()
        {
            var ownerToken = await RegisterAndLoginAsync("owner_upload_nested", "Pass123!", "owner_upload_nested@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var parentDirectory = await CreateDirectoryAsync($"shared-parent-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);
            var childDirectory = await CreateDirectoryAsync($"child-{Guid.NewGuid():N}", parentDirectory.Id, TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("guest_upload_nested", "Pass123!", "guest_upload_nested@example.com",
                TestContext.Current.CancellationToken);

            await AddShareAsync(parentDirectory.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "guest_upload_nested",
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);

            await AddShareAsync(childDirectory.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "guest_upload_nested",
                AccessMode = ShareAccessMode.FullAccess
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);
            var response = await StartUploadAsGuestAsync(childDirectory.Id, TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var sharedFile = await response.Content.ReadFromJsonAsync<SharedFileResponse>(cancellationToken: TestContext.Current.CancellationToken);
            sharedFile.Should().NotBeNull();
            sharedFile!.ParentId.Should().Be(childDirectory.Id);
            sharedFile.AccessMode.Should().Be(ShareAccessMode.FullAccess);
        }

        [Fact]
        public async Task UploadToNestedDirectory_InheritsParentShare()
        {
            var ownerToken = await RegisterAndLoginAsync("owner_upload_inherit", "Pass123!", "owner_upload_inherit@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var parentDirectory =
                await CreateDirectoryAsync($"shared-parent-inherit-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);
            var childDirectory =
                await CreateDirectoryAsync($"child-inherit-{Guid.NewGuid():N}", parentDirectory.Id, TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("guest_upload_inherit", "Pass123!", "guest_upload_inherit@example.com",
                TestContext.Current.CancellationToken);

            await AddShareAsync(parentDirectory.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "guest_upload_inherit",
                AccessMode = ShareAccessMode.FullAccess
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);
            var response = await StartUploadAsGuestAsync(childDirectory.Id, TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var sharedFile = await response.Content.ReadFromJsonAsync<SharedFileResponse>(cancellationToken: TestContext.Current.CancellationToken);
            sharedFile.Should().NotBeNull();
            sharedFile!.ParentId.Should().Be(childDirectory.Id);
            sharedFile.AccessMode.Should().Be(ShareAccessMode.FullAccess);
        }

        private Task<HttpResponseMessage> StartUploadAsGuestAsync(int parentId, CancellationToken token = default)
        {
            return Client.PostAsJsonAsync("/api/Upload/Start", new UploadFileInfoRequest
            {
                FileName = "guest-upload.bin",
                Size = 1024,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream",
                ParentId = parentId
            }, cancellationToken: token);
        }
    }
}