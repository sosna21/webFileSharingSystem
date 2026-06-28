using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.IntegrationTests.Helpers;
using webFileSharingSystem.Web.Contracts.Requests;
using webFileSharingSystem.Web.Contracts.Responses;
using Xunit;

namespace webFileSharingSystem.IntegrationTests.Shares
{
    public class ShareCrudTests(SqlServerContainerFixture dbFixture) : IntegrationTestBase(dbFixture)
    {
        [Fact]
        public async Task ShareLifecycle_CreateUpdateDelete_ReflectedInList()
        {
            var ownerToken = await RegisterAndLoginAsync("owner_share", "Pass123!", "owner_share@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var directory = await CreateDirectoryAsync($"shared-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);
            await RegisterAndLoginAsync("guest_share", "Pass123!", "guest_share@example.com", TestContext.Current.CancellationToken);

            var createdShare = await AddShareAsync(directory.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "guest_share",
                AccessMode = ShareAccessMode.ReadWrite
            }, TestContext.Current.CancellationToken);

            var listResponse = await Client.GetAsync($"/api/Share/GetShares/{directory.Id}", TestContext.Current.CancellationToken);
            listResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var shares = await listResponse.Content.ReadFromJsonAsync<List<ShareResponse>>(cancellationToken: TestContext.Current.CancellationToken);
            shares.Should().NotBeNull();
            shares!.Should().ContainSingle(share => share.ShareId == createdShare.ShareId && share.AccessMode == ShareAccessMode.ReadWrite);

            await UpdateShareAsync(createdShare.ShareId, new UpdateFileShareRequest
            {
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);

            var updatedResponse = await Client.GetAsync($"/api/Share/GetShares/{directory.Id}", TestContext.Current.CancellationToken);
            updatedResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var updatedShares =
                await updatedResponse.Content.ReadFromJsonAsync<List<ShareResponse>>(cancellationToken: TestContext.Current.CancellationToken);
            updatedShares.Should().NotBeNull();
            updatedShares!.Should().ContainSingle(share => share.ShareId == createdShare.ShareId && share.AccessMode == ShareAccessMode.ReadOnly);

            await DeleteShareAsync(createdShare.ShareId, TestContext.Current.CancellationToken);

            var emptyResponse = await Client.GetAsync($"/api/Share/GetShares/{directory.Id}", TestContext.Current.CancellationToken);
            emptyResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var emptyShares =
                await emptyResponse.Content.ReadFromJsonAsync<List<ShareResponse>>(cancellationToken: TestContext.Current.CancellationToken);
            emptyShares.Should().NotBeNull();
            emptyShares!.Should().BeEmpty();
        }

        [Fact]
        public async Task AddShare_ReturnsBadRequest_WhenUserDoesNotExist()
        {
            var ownerToken = await RegisterAndLoginAsync("owner_share_missing", "Pass123!", "owner_share_missing@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var directory = await CreateDirectoryAsync($"shared-missing-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);

            var response = await Client.PostAsJsonAsync($"/api/Share/{directory.Id}", new AddFileShareRequest
            {
                UserNameToShareWith = "missing_user",
                AccessMode = ShareAccessMode.ReadWrite
            }, cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task GetShares_ReturnsUnauthorized_WithoutToken()
        {
            var ownerToken = await RegisterAndLoginAsync("owner_share_auth", "Pass123!", "owner_share_auth@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var directory = await CreateDirectoryAsync($"shared-auth-{Guid.NewGuid():N}", token: TestContext.Current.CancellationToken);

            ClearBearerToken();
            var response = await Client.GetAsync($"/api/Share/GetShares/{directory.Id}", TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}