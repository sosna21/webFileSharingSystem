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
    public class ShareCrudTests : IntegrationTestBase
    {
        public ShareCrudTests(SqlServerContainerFixture dbFixture) : base(dbFixture)
        {
        }

        [Fact]
        public async Task ShareLifecycle_CreateUpdateDelete_ReflectedInList()
        {
            var ownerToken = await RegisterAndLoginAsync("owner_share", "Pass123!", "owner_share@example.com");
            SetBearerToken(ownerToken);

            var directory = await CreateDirectoryAsync($"shared-{Guid.NewGuid():N}");
            await RegisterAndLoginAsync("guest_share", "Pass123!", "guest_share@example.com");

            var createdShare = await AddShareAsync(directory.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "guest_share",
                AccessMode = ShareAccessMode.ReadWrite
            });

            var listResponse = await Client.GetAsync($"/api/Share/GetShares/{directory.Id}");
            listResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var shares = await listResponse.Content.ReadFromJsonAsync<List<ShareResponse>>();
            shares.Should().NotBeNull();
            shares!.Should().ContainSingle(share => share.ShareId == createdShare.ShareId && share.AccessMode == ShareAccessMode.ReadWrite);

            await UpdateShareAsync(createdShare.ShareId, new UpdateFileShareRequest
            {
                AccessMode = ShareAccessMode.ReadOnly
            });

            var updatedResponse = await Client.GetAsync($"/api/Share/GetShares/{directory.Id}");
            updatedResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var updatedShares = await updatedResponse.Content.ReadFromJsonAsync<List<ShareResponse>>();
            updatedShares.Should().NotBeNull();
            updatedShares!.Should().ContainSingle(share => share.ShareId == createdShare.ShareId && share.AccessMode == ShareAccessMode.ReadOnly);

            await DeleteShareAsync(createdShare.ShareId);

            var emptyResponse = await Client.GetAsync($"/api/Share/GetShares/{directory.Id}");
            emptyResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var emptyShares = await emptyResponse.Content.ReadFromJsonAsync<List<ShareResponse>>();
            emptyShares.Should().NotBeNull();
            emptyShares!.Should().BeEmpty();
        }

        [Fact]
        public async Task AddShare_ReturnsBadRequest_WhenUserDoesNotExist()
        {
            var ownerToken = await RegisterAndLoginAsync("owner_share_missing", "Pass123!", "owner_share_missing@example.com");
            SetBearerToken(ownerToken);

            var directory = await CreateDirectoryAsync($"shared-missing-{Guid.NewGuid():N}");

            var response = await Client.PostAsJsonAsync($"/api/Share/{directory.Id}", new AddFileShareRequest
            {
                UserNameToShareWith = "missing_user",
                AccessMode = ShareAccessMode.ReadWrite
            });

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task GetShares_ReturnsUnauthorized_WithoutToken()
        {
            var ownerToken = await RegisterAndLoginAsync("owner_share_auth", "Pass123!", "owner_share_auth@example.com");
            SetBearerToken(ownerToken);

            var directory = await CreateDirectoryAsync($"shared-auth-{Guid.NewGuid():N}");

            ClearBearerToken();
            var response = await Client.GetAsync($"/api/Share/GetShares/{directory.Id}");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
