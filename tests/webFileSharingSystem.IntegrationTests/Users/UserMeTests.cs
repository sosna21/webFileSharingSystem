using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using webFileSharingSystem.IntegrationTests.Helpers;
using webFileSharingSystem.Web.Contracts.Responses;
using Xunit;

namespace webFileSharingSystem.IntegrationTests.Users
{
    public class UserMeTests(SqlServerContainerFixture dbFixture) : IntegrationTestBase(dbFixture)
    {
        [Fact]
        public async Task GetMe_ReturnsUnauthorized_WithoutToken()
        {
            var response = await Client.GetAsync("/api/User/Me", TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetMe_ReturnsUser_UsingValidToken()
        {
            var token = await RegisterAndLoginAsync("user_me", "Pass123!", "user_me@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var response = await Client.GetAsync("/api/User/Me", TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var user = await response.Content.ReadFromJsonAsync<AppUserResponse>(cancellationToken: TestContext.Current.CancellationToken);
            user.Should().NotBeNull();
            user!.UserName.Should().Be("user_me");
        }

        [Fact]
        public async Task GetMe_ReturnsPhotoFields_WhenPhotoUploaded()
        {
            var token = await RegisterAndLoginAsync("user_me_photo", "Pass123!", "user_me_photo@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var content = CreatePhotoContent(GetFakeJpeg(), "image/jpeg");
            var uploadResponse = await Client.PutAsync("/api/User/Me/Photo", content, TestContext.Current.CancellationToken);
            uploadResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await Client.GetAsync("/api/User/Me", TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var user = await response.Content.ReadFromJsonAsync<AppUserResponse>(cancellationToken: TestContext.Current.CancellationToken);
            user.Should().NotBeNull();
            user!.PhotoUrl.Should().NotBeNullOrWhiteSpace();
            user.PhotoMimeType.Should().Be("image/jpeg");
            user.PhotoSize.Should().NotBeNull();
            user.PhotoUpdatedAt.Should().NotBeNull();
        }

        [Fact]
        public async Task GetQuota_ReturnsValues()
        {
            var token = await RegisterAndLoginAsync("user_me_quota", "Pass123!", "user_me_quota@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var response = await Client.GetAsync("/api/User/Me/Quota", TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var payload =
                await response.Content.ReadFromJsonAsync<Dictionary<string, ulong>>(cancellationToken: TestContext.Current.CancellationToken);
            payload.Should().NotBeNull();

            var keys = payload!.Keys.Select(k => k.ToLowerInvariant()).ToArray();
            keys.Should().Contain("usedspace");
            keys.Should().Contain("quota");
        }

        private static MultipartFormDataContent CreatePhotoContent(byte[] bytes, string contentType)
        {
            var content = new MultipartFormDataContent();
            var photo = new ByteArrayContent(bytes);
            photo.Headers.ContentType = new MediaTypeHeaderValue(contentType);
            content.Add(photo, "Photo", "photo.bin");
            return content;
        }

        private static byte[] GetFakeJpeg()
        {
            return
            [
                0xFF, 0xD8, 0xFF, 0xE0,
                0x00, 0x10, 0x4A, 0x46,
                0x49, 0x46, 0x00, 0x01,
                0x01, 0x01, 0x00, 0x60,
                0x00, 0x60, 0x00, 0x00,
                0xFF, 0xD9
            ];
        }
    }
}