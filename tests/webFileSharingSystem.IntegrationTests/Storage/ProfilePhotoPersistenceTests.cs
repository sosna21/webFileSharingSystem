using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using webFileSharingSystem.Core.Options;
using webFileSharingSystem.Infrastructure.Storage;
using Xunit;

namespace webFileSharingSystem.IntegrationTests.Storage
{
    public class ProfilePhotoPersistenceTests : IDisposable
    {
        private const string OnPremiseFileLocation = "./TestResourcesProfilePhotos";
        private const string PhotoSubdirectory = "photos";
        private const int UserId = 1;

        private readonly LocalProfilePhotoPersistenceService _profilePhotoPersistenceService;

        public ProfilePhotoPersistenceTests()
        {
            if (Directory.Exists(OnPremiseFileLocation))
            {
                Directory.Delete(OnPremiseFileLocation, true);
            }

            Directory.CreateDirectory(OnPremiseFileLocation);

            _profilePhotoPersistenceService = new LocalProfilePhotoPersistenceService(
                Options.Create(new StorageSettings
                {
                    UserDefaultQuota = 0,
                    OnPremiseFileLocation = OnPremiseFileLocation,
                    ProfilePhotoSubdirectory = PhotoSubdirectory
                }));
        }

        [Fact]
        public async Task SaveGetAndDeletePhoto()
        {
            var fileGuid = Guid.NewGuid();
            var expected = GetFakeJpeg();

            await using var saveStream = new MemoryStream(expected);
            await _profilePhotoPersistenceService.SavePhoto(UserId, fileGuid, saveStream, TestContext.Current.CancellationToken);

            var savedPath = Path.Combine(OnPremiseFileLocation, PhotoSubdirectory, fileGuid.ToString());
            Assert.True(File.Exists(savedPath));

            byte[] actual;
            await using (var output = await _profilePhotoPersistenceService.GetPhotoStream(UserId, fileGuid, TestContext.Current.CancellationToken))
            await using (var outputBuffer = new MemoryStream())
            {
                await output.CopyToAsync(outputBuffer, TestContext.Current.CancellationToken);
                actual = outputBuffer.ToArray();
            }

            Assert.True(expected.SequenceEqual(actual));

            await _profilePhotoPersistenceService.DeletePhoto(UserId, fileGuid);
            Assert.False(File.Exists(savedPath));
        }

        [Fact]
        public async Task GetPhotoStream_ThrowsWhenMissing()
        {
            var missingGuid = Guid.NewGuid();

            await Assert.ThrowsAsync<FileNotFoundException>(async () =>
            {
                await using var stream = await _profilePhotoPersistenceService.GetPhotoStream(UserId, missingGuid, TestContext.Current.CancellationToken);
            });
        }

        [Fact]
        public async Task DeletePhoto_DoesNotThrow_WhenMissing()
        {
            var missingGuid = Guid.NewGuid();
            var missingPath = Path.Combine(OnPremiseFileLocation, PhotoSubdirectory, missingGuid.ToString());

            await _profilePhotoPersistenceService.DeletePhoto(UserId, missingGuid);

            Assert.False(File.Exists(missingPath));
        }

        public void Dispose()
        {
            if (Directory.Exists(OnPremiseFileLocation))
            {
                Directory.Delete(OnPremiseFileLocation, true);
            }
        }

        private static byte[] GetFakeJpeg()
        {
            return new byte[]
            {
                0xFF, 0xD8, 0xFF, 0xE0,
                0x00, 0x10, 0x4A, 0x46,
                0x49, 0x46, 0x00, 0x01,
                0x01, 0x01, 0x00, 0x60,
                0x00, 0x60, 0x00, 0x00,
                0xFF, 0xD9
            };
        }
    }
}
