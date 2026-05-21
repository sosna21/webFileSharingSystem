using System;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.IntegrationTests.Helpers;
using webFileSharingSystem.Web.Contracts.Requests;
using Xunit;

namespace webFileSharingSystem.IntegrationTests.Authorization
{
    public class ShareAuthorizationTests(SqlServerContainerFixture dbFixture) : IntegrationTestBase(dbFixture)
    {
        [Fact]
        public async Task AddShare_ReturnsUnauthorized_WithoutToken()
        {
            var ownerToken = await RegisterAndLoginAsync("share_auth_owner", "Pass123!", "share_auth_owner@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var directory = await CreateDirectoryAsync($"share-auth-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);
            await RegisterAndLoginAsync("share_auth_guest", "Pass123!", "share_auth_guest@example.com", TestContext.Current.CancellationToken);

            ClearBearerToken();
            var response = await Client.PostAsJsonAsync($"/api/Share/{directory.Id}", new AddFileShareRequest
            {
                UserNameToShareWith = "share_auth_guest",
                AccessMode = ShareAccessMode.ReadOnly
            }, cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task UpdateShare_ReturnsUnauthorized_WithoutToken()
        {
            var ownerToken = await RegisterAndLoginAsync("share_auth_owner_update", "Pass123!", "share_auth_owner_update@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var directory = await CreateDirectoryAsync($"share-auth-update-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);
            await RegisterAndLoginAsync("share_auth_guest_update", "Pass123!", "share_auth_guest_update@example.com",
                TestContext.Current.CancellationToken);

            var share = await AddShareAsync(directory.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "share_auth_guest_update",
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);

            ClearBearerToken();
            var response = await Client.PutAsJsonAsync($"/api/Share/{share.ShareId}", new UpdateFileShareRequest
            {
                AccessMode = ShareAccessMode.ReadWrite
            }, cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task DeleteShare_ReturnsUnauthorized_WithoutToken()
        {
            var ownerToken = await RegisterAndLoginAsync("share_auth_owner_delete", "Pass123!", "share_auth_owner_delete@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var directory = await CreateDirectoryAsync($"share-auth-delete-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);
            await RegisterAndLoginAsync("share_auth_guest_delete", "Pass123!", "share_auth_guest_delete@example.com",
                TestContext.Current.CancellationToken);

            var share = await AddShareAsync(directory.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "share_auth_guest_delete",
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);

            ClearBearerToken();
            var response = await Client.DeleteAsync($"/api/Share/{share.ShareId}", TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task RemoveShare_ReturnsUnauthorized_WithoutToken()
        {
            var ownerToken = await RegisterAndLoginAsync("share_auth_owner_remove", "Pass123!", "share_auth_owner_remove@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var directory = await CreateDirectoryAsync($"share-auth-remove-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);
            await RegisterAndLoginAsync("share_auth_guest_remove", "Pass123!", "share_auth_guest_remove@example.com",
                TestContext.Current.CancellationToken);

            await AddShareAsync(directory.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "share_auth_guest_remove",
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);

            ClearBearerToken();
            var response = await Client.DeleteAsync($"/api/Share/RemoveShare/{directory.Id}", TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}