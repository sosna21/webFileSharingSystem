using System.Net;
using System.Threading.Tasks;
using FluentAssertions;
using webFileSharingSystem.IntegrationTests.Helpers;
using Xunit;

namespace webFileSharingSystem.IntegrationTests.Authorization
{
    public class DownloadAuthorizationTests : IntegrationTestBase
    {
        public DownloadAuthorizationTests(SqlServerContainerFixture dbFixture) : base(dbFixture)
        {
        }

        [Fact]
        public async Task GenerateDownloadUrl_ReturnsUnauthorized_WithoutToken()
        {
            ClearBearerToken();

            var response = await Client.PostAsync("/api/Download/url?fileIds=1", content: null, TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
