using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.IntegrationTests.Helpers;
using webFileSharingSystem.Web.Contracts.Responses;
using Xunit;
using File = System.IO.File;

namespace webFileSharingSystem.IntegrationTests.Users
{
    public class UserPhotoValidationTests(SqlServerContainerFixture dbFixture) : IntegrationTestBase(dbFixture)
    {
        [Fact]
        public async Task UploadPhoto_ReturnsBadRequest_WhenPhotoMissing()
        {
            var token = await RegisterAndLoginAsync("user_photo", "Pass123!", "user_photo@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(token);

            using var content = new MultipartFormDataContent();

            var response = await Client.PutAsync("/api/User/Me/Photo", content, TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task UploadPhoto_ReturnsBadRequest_WhenInvalidFormat()
        {
            var token = await RegisterAndLoginAsync("user_photo_invalid", "Pass123!", "user_photo_invalid@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var content = CreatePhotoContent(new byte[] { 0x00, 0x01, 0x02, 0x03 }, "image/jpeg");

            var response = await Client.PutAsync("/api/User/Me/Photo", content, TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task UploadPhoto_ReturnsBadRequest_WhenTooLarge()
        {
            var token = await RegisterAndLoginAsync("user_photo_large", "Pass123!", "user_photo_large@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var oversized = new byte[5_242_881];
            oversized[0] = 0xFF;
            oversized[1] = 0xD8;
            oversized[2] = 0xFF;

            var content = CreatePhotoContent(oversized, "image/jpeg");

            var response = await Client.PutAsync("/api/User/Me/Photo", content, TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task UploadPhoto_ReplacesPhotoAndDeletesOldFile()
        {
            var token = await RegisterAndLoginAsync("user_photo_replace", "Pass123!", "user_photo_replace@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var storageRoot = await GetStorageRootAsync();

            var firstContent = CreatePhotoContent(GetFakeJpeg(), "image/jpeg");
            var firstResponse = await Client.PutAsync("/api/User/Me/Photo", firstContent, TestContext.Current.CancellationToken);
            firstResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            Guid? firstGuid = null;
            await WithDbContextAsync(async context =>
            {
                var user = await context.Set<ApplicationUser>().SingleAsync(u => u.UserName == "user_photo_replace");
                firstGuid = user.PhotoFileGuid;
            });

            firstGuid.Should().NotBeNull();
            var firstPath = Path.Combine(storageRoot, "photos", firstGuid!.Value.ToString());
            File.Exists(firstPath).Should().BeTrue();

            var secondContent = CreatePhotoContent(GetFakeJpeg(), "image/jpeg");
            var secondResponse = await Client.PutAsync("/api/User/Me/Photo", secondContent, TestContext.Current.CancellationToken);
            secondResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            Guid? secondGuid = null;
            await WithDbContextAsync(async context =>
            {
                var user = await context.Set<ApplicationUser>().SingleAsync(u => u.UserName == "user_photo_replace");
                secondGuid = user.PhotoFileGuid;
            });

            secondGuid.Should().NotBeNull();
            secondGuid!.Value.Should().NotBe(firstGuid.Value);

            File.Exists(firstPath).Should().BeFalse();
            var secondPath = Path.Combine(storageRoot, "photos", secondGuid!.Value.ToString());
            File.Exists(secondPath).Should().BeTrue();
        }

        [Fact]
        public async Task DeletePhoto_RemovesMetadataAndFile()
        {
            var token = await RegisterAndLoginAsync("user_photo_delete", "Pass123!", "user_photo_delete@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var storageRoot = await GetStorageRootAsync();
            var content = CreatePhotoContent(GetFakeJpeg(), "image/jpeg");
            var uploadResponse = await Client.PutAsync("/api/User/Me/Photo", content, TestContext.Current.CancellationToken);
            uploadResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            Guid? photoGuid = null;
            await WithDbContextAsync(async context =>
            {
                var user = await context.Set<ApplicationUser>().SingleAsync(u => u.UserName == "user_photo_delete");
                photoGuid = user.PhotoFileGuid;
            });

            photoGuid.Should().NotBeNull();
            var photoPath = Path.Combine(storageRoot, "photos", photoGuid!.Value.ToString());
            File.Exists(photoPath).Should().BeTrue();

            var deleteResponse = await Client.DeleteAsync("/api/User/Me/Photo", TestContext.Current.CancellationToken);
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            File.Exists(photoPath).Should().BeFalse();

            var meResponse = await Client.GetAsync("/api/User/Me", TestContext.Current.CancellationToken);
            meResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var userResponse = await meResponse.Content.ReadFromJsonAsync<AppUserResponse>(cancellationToken: TestContext.Current.CancellationToken);
            userResponse.Should().NotBeNull();
            userResponse!.PhotoUrl.Should().BeNull();
            userResponse.PhotoMimeType.Should().BeNull();
            userResponse.PhotoSize.Should().BeNull();
        }

        [Fact]
        public async Task GetPhotoById_ReturnsNotFound_WhenMissing()
        {
            var token = await RegisterAndLoginAsync("user_photo_missing", "Pass123!", "user_photo_missing@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var response = await Client.GetAsync($"/api/User/Photo/{Guid.NewGuid()}", TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task GetPhotoById_ReturnsPhotoContent()
        {
            var token = await RegisterAndLoginAsync("user_photo_get", "Pass123!", "user_photo_get@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var expected = GetFakeJpeg();
            var content = CreatePhotoContent(expected, "image/jpeg");
            var uploadResponse = await Client.PutAsync("/api/User/Me/Photo", content, TestContext.Current.CancellationToken);
            uploadResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var meResponse = await Client.GetAsync("/api/User/Me", TestContext.Current.CancellationToken);
            meResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var userResponse = await meResponse.Content.ReadFromJsonAsync<AppUserResponse>(cancellationToken: TestContext.Current.CancellationToken);
            userResponse.Should().NotBeNull();
            userResponse!.PhotoUrl.Should().NotBeNullOrWhiteSpace();

            var photoResponse = await Client.GetAsync(userResponse.PhotoUrl!, TestContext.Current.CancellationToken);
            photoResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            photoResponse.Content.Headers.ContentType!.MediaType.Should().Be("image/jpeg");

            var bytes = await photoResponse.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken);
            bytes.Should().Equal(expected);
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