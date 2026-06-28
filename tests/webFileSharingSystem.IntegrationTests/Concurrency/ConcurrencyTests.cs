using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.IntegrationTests.Helpers;
using webFileSharingSystem.Web.Contracts.Requests;
using webFileSharingSystem.Web.Contracts.Responses;
using Xunit;
using File = System.IO.File;
using FileEntity = webFileSharingSystem.Core.Entities.File;

namespace webFileSharingSystem.IntegrationTests.Concurrency
{
    public class ConcurrencyTests(SqlServerContainerFixture dbFixture) : IntegrationTestBase(dbFixture)
    {
        private const int DefaultChunkSize = 512 * 1024;

        [Fact]
        public async Task ParallelChunkUploads_CompleteAndMatchContent()
        {
            var token = await RegisterAndLoginAsync("concurrent_chunks", "Pass123!", "concurrent_chunks@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var sizeBytes = DefaultChunkSize * 2 + 321;
            var content = new byte[sizeBytes];
            new Random(41).NextBytes(content);

            var (fileId, chunkSize, numberOfChunks) =
                await StartUploadWithInfoAsync("parallel-chunks.bin", sizeBytes, token: TestContext.Current.CancellationToken);

            var uploadTasks = Enumerable.Range(0, numberOfChunks)
                .Select(index => UploadChunkAsync(Client, fileId, index, GetChunk(content, index, chunkSize), TestContext.Current.CancellationToken))
                .ToArray();

            var responses = await Task.WhenAll(uploadTasks);
            responses.All(r => r.StatusCode == HttpStatusCode.OK).Should().BeTrue();

            var completeResponse = await Client.PutAsync($"/api/Upload/{fileId}/Complete", content: null, TestContext.Current.CancellationToken);
            completeResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            await AssertStoredFileEqualsAsync(fileId, content, TestContext.Current.CancellationToken);
        }

        [Fact]
        public async Task SameChunkUploadedConcurrently_WithSameBytes_Succeeds()
        {
            var token = await RegisterAndLoginAsync("concurrent_chunk_same", "Pass123!", "concurrent_chunk_same@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var sizeBytes = DefaultChunkSize * 2 + 17;
            var content = new byte[sizeBytes];
            new Random(43).NextBytes(content);

            var (fileId, chunkSize, numberOfChunks) =
                await StartUploadWithInfoAsync("same-chunk.bin", sizeBytes, token: TestContext.Current.CancellationToken);

            var chunk = GetChunk(content, 0, chunkSize);
            var uploadTasks = Enumerable.Range(0, 4)
                .Select(_ => UploadChunkAsync(Client, fileId, 0, chunk, TestContext.Current.CancellationToken))
                .ToArray();

            var responses = await Task.WhenAll(uploadTasks);
            responses.All(r => r.StatusCode == HttpStatusCode.OK).Should().BeTrue();

            for (var index = 1; index < numberOfChunks; index++)
            {
                var response = await UploadChunkAsync(Client, fileId, index, GetChunk(content, index, chunkSize),
                    TestContext.Current.CancellationToken);
                response.StatusCode.Should().Be(HttpStatusCode.OK);
            }

            var completeResponse = await Client.PutAsync($"/api/Upload/{fileId}/Complete", content: null, TestContext.Current.CancellationToken);
            completeResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            await AssertStoredFileEqualsAsync(fileId, content, TestContext.Current.CancellationToken);
        }

        [Fact]
        public async Task CompleteUpload_ConcurrentCalls_AreIdempotent()
        {
            var token = await RegisterAndLoginAsync("concurrent_complete", "Pass123!", "concurrent_complete@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var sizeBytes = DefaultChunkSize + 77;
            var content = new byte[sizeBytes];
            new Random(53).NextBytes(content);

            var (fileId, chunkSize, numberOfChunks) =
                await StartUploadWithInfoAsync("complete-idempotent.bin", sizeBytes, token: TestContext.Current.CancellationToken);

            for (var index = 0; index < numberOfChunks; index++)
            {
                var response = await UploadChunkAsync(Client, fileId, index, GetChunk(content, index, chunkSize),
                    TestContext.Current.CancellationToken);
                response.StatusCode.Should().Be(HttpStatusCode.OK);
            }

            var completeTasks = Enumerable.Range(0, 4)
                .Select(_ => Client.PutAsync($"/api/Upload/{fileId}/Complete", content: null, TestContext.Current.CancellationToken))
                .ToArray();

            var completeResponses = await Task.WhenAll(completeTasks);
            completeResponses.All(r => r.StatusCode == HttpStatusCode.OK).Should().BeTrue();

            await WithDbContextAsync(async context =>
            {
                var file = await context.Set<FileEntity>()
                    .Include(f => f.PartialFileInfo)
                    .SingleAsync(f => f.Id == fileId, cancellationToken: TestContext.Current.CancellationToken);
                file.FileStatus.Should().Be(FileStatus.Completed);
                file.PartialFileInfo.Should().BeNull();
            });

            await AssertStoredFileEqualsAsync(fileId, content, TestContext.Current.CancellationToken);
        }

        [Fact]
        public async Task ConcurrentUploadsToSameDirectory_UniqueNamesForSharedFolder()
        {
            var ownerToken = await RegisterAndLoginAsync("concurrent_same_name_owner", "Pass123!",
                "concurrent_same_name_owner@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var directory = await CreateDirectoryAsync("shared-same-name", token: TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("concurrent_same_name_guest", "Pass123!",
                "concurrent_same_name_guest@example.com", TestContext.Current.CancellationToken);

            await AddShareAsync(directory.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "concurrent_same_name_guest",
                AccessMode = ShareAccessMode.ReadWrite
            }, TestContext.Current.CancellationToken);

            using var ownerClient = CreateAuthenticatedClient(ownerToken);
            using var guestClient = CreateAuthenticatedClient(guestToken);

            var startOwner = StartUploadForClientAsync(ownerClient, directory.Id, "same-name.txt", TestContext.Current.CancellationToken);
            var startGuest = StartUploadForClientAsync(guestClient, directory.Id, "same-name.txt", TestContext.Current.CancellationToken);

            var startResponses = await Task.WhenAll(startOwner, startGuest);

            startResponses[0].Response.StatusCode.Should().Be(HttpStatusCode.OK);
            startResponses[1].Response.StatusCode.Should().Be(HttpStatusCode.OK);

            var names = startResponses.Select(response => response.FileName).ToArray();
            names.Distinct().Should().HaveCount(2);
            names.Should().Contain("same-name.txt");
            names.Should().Contain("same-name (1).txt");

            var uploadTasks = startResponses.Select(response => UploadSingleChunkAndCompleteAsync(response.Client, response.FileId,
                response.Content, TestContext.Current.CancellationToken));
            await Task.WhenAll(uploadTasks);
        }

        [Fact]
        public async Task ConcurrentShareCreation_AllowsSingleShare()
        {
            var ownerToken = await RegisterAndLoginAsync("concurrent_share_owner", "Pass123!", "concurrent_share_owner@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var fileId = await UploadSingleChunkAsync("share-target.bin", 64 * 1024, token: TestContext.Current.CancellationToken);

            await RegisterAndLoginAsync("concurrent_share_guest", "Pass123!", "concurrent_share_guest@example.com",
                TestContext.Current.CancellationToken);

            var shareRequest = new AddFileShareRequest
            {
                UserNameToShareWith = "concurrent_share_guest",
                AccessMode = ShareAccessMode.ReadOnly
            };

            var shareTasks = Enumerable.Range(0, 4)
                .Select(_ => Client.PostAsJsonAsync($"/api/Share/{fileId}", shareRequest, TestContext.Current.CancellationToken))
                .ToArray();

            var responses = await Task.WhenAll(shareTasks);
            responses.Count(r => r.StatusCode == HttpStatusCode.OK).Should().Be(1);
            responses.Count(r => r.StatusCode == HttpStatusCode.BadRequest).Should().Be(3);

            await WithDbContextAsync(async context =>
            {
                var guestId = await context.ApplicationUsers
                    .Where(user => user.UserName == "concurrent_share_guest")
                    .Select(user => user.Id)
                    .SingleAsync(cancellationToken: TestContext.Current.CancellationToken);

                var activeShares = await context.Set<Share>()
                    .Where(share => share.FileId == fileId && share.RevokedAt == null)
                    .ToListAsync(cancellationToken: TestContext.Current.CancellationToken);

                activeShares.Should().ContainSingle(share => share.SharedWithUserId == guestId);
            });
        }

        [Fact]
        public async Task ConcurrentUploads_ExceedQuota_OnlySomeSucceed()
        {
            var token = await RegisterAndLoginAsync("concurrent_quota", "Pass123!", "concurrent_quota@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var sizePerFile = 96 * 1024;
            var uploadCount = 3;
            var allowedUploads = 2;

            await WithDbContextAsync(async context =>
            {
                var user = await context.ApplicationUsers.SingleAsync(u => u.UserName == "concurrent_quota",
                    cancellationToken: TestContext.Current.CancellationToken);
                user.Quota = (ulong)(sizePerFile * allowedUploads);
                user.UsedSpace = 0;
                await context.SaveChangesAsync(TestContext.Current.CancellationToken);
            });

            var uploadTasks = Enumerable.Range(0, uploadCount)
                .Select(index => TryUploadSingleChunkAsync($"quota-{index}.bin", sizePerFile, TestContext.Current.CancellationToken))
                .ToArray();

            var results = await Task.WhenAll(uploadTasks);
            results.Count(r => r.StatusCode == HttpStatusCode.OK).Should().Be(allowedUploads);
            results.Count(r => r.StatusCode == HttpStatusCode.BadRequest).Should().Be(uploadCount - allowedUploads);

            await WithDbContextAsync(async context =>
            {
                var user = await context.ApplicationUsers.SingleAsync(u => u.UserName == "concurrent_quota",
                    cancellationToken: TestContext.Current.CancellationToken);
                user.UsedSpace.Should().Be((ulong)(sizePerFile * allowedUploads));
            });
        }

        [Fact]
        public async Task ParentDirectoryDeletedDuringUpload_CancelsUploadAndRemovesChunks()
        {
            var token = await RegisterAndLoginAsync("concurrent_parent_delete", "Pass123!",
                "concurrent_parent_delete@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var parent = await CreateDirectoryAsync("upload-parent", token: TestContext.Current.CancellationToken);

            var sizeBytes = DefaultChunkSize * 2 + 71;
            var content = new byte[sizeBytes];
            new Random(59).NextBytes(content);

            var (fileId, chunkSize, _) = await StartUploadWithInfoAsync("parent-delete.bin", sizeBytes,
                parent.Id, TestContext.Current.CancellationToken);

            var firstChunkResponse = await UploadChunkAsync(Client, fileId, 0, GetChunk(content, 0, chunkSize),
                TestContext.Current.CancellationToken);
            firstChunkResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var storageRoot = await GetStorageRootAsync();
            Guid fileGuid = Guid.Empty;
            await WithDbContextAsync(async context =>
            {
                var file = await context.Set<FileEntity>()
                    .SingleAsync(f => f.Id == fileId, cancellationToken: TestContext.Current.CancellationToken);
                fileGuid = file.FileGuid!.Value;
            });

            var deleteResponse = await Client.DeleteAsync($"/api/File/Delete/{parent.Id}",
                TestContext.Current.CancellationToken);
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var uploadAfterDelete = await UploadChunkAsync(Client, fileId, 1, GetChunk(content, 1, chunkSize),
                TestContext.Current.CancellationToken);
            uploadAfterDelete.StatusCode.Should().Be(HttpStatusCode.BadRequest);

            await WithDbContextAsync(async context =>
            {
                var file = await context.Set<FileEntity>()
                    .SingleOrDefaultAsync(f => f.Id == fileId, cancellationToken: TestContext.Current.CancellationToken);
                file.Should().BeNull();

                var partialExists = await context.Set<PartialFileInfo>()
                    .AnyAsync(p => p.FileId == fileId, cancellationToken: TestContext.Current.CancellationToken);
                partialExists.Should().BeFalse();
            });

            var filePath = System.IO.Path.Combine(storageRoot, fileGuid.ToString());
            File.Exists(filePath).Should().BeFalse();
        }

        [Fact]
        public async Task ConcurrentMove_SameFileToTwoDirectories_LastWins()
        {
            var token = await RegisterAndLoginAsync("concurrent_move", "Pass123!", "concurrent_move@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var fileId = await UploadSingleChunkAsync("move-target.bin", 64 * 1024, token: TestContext.Current.CancellationToken);
            var targetA = await CreateDirectoryAsync("move-a", token: TestContext.Current.CancellationToken);
            var targetB = await CreateDirectoryAsync("move-b", token: TestContext.Current.CancellationToken);

            using var clientA = CreateAuthenticatedClient(token);
            using var clientB = CreateAuthenticatedClient(token);

            var moveA = clientA.PutAsJsonAsync($"/api/File/Move/{targetA.Id}", new[] { fileId }, TestContext.Current.CancellationToken);
            var moveB = clientB.PutAsJsonAsync($"/api/File/Move/{targetB.Id}", new[] { fileId }, TestContext.Current.CancellationToken);

            var responses = await Task.WhenAll(moveA, moveB);
            responses.Should().OnlyContain(r => r.StatusCode == HttpStatusCode.OK);

            await WithDbContextAsync(async context =>
            {
                var file = await context.Set<FileEntity>()
                    .SingleAsync(f => f.Id == fileId, cancellationToken: TestContext.Current.CancellationToken);

                file.ParentId.Should().BeOneOf(targetA.Id, targetB.Id);

                var count = await context.Set<FileEntity>()
                    .CountAsync(
                        f => f.Id == fileId,
                        cancellationToken: TestContext.Current.CancellationToken);

                count.Should().Be(1);
            });
        }

        [Fact]
        public async Task ConcurrentRename_LastWriteWins_NoAutoResolution()
        {
            var token = await RegisterAndLoginAsync("concurrent_rename", "Pass123!", "concurrent_rename@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var fileId = await UploadSingleChunkAsync("rename-target.bin", 64 * 1024, token: TestContext.Current.CancellationToken);

            using var clientA = CreateAuthenticatedClient(token);
            using var clientB = CreateAuthenticatedClient(token);

            var renameA = clientA.PutAsync($"/api/File/Rename/{fileId}?name=alpha.txt", content: null,
                TestContext.Current.CancellationToken);
            var renameB = clientB.PutAsync($"/api/File/Rename/{fileId}?name=beta.txt", content: null,
                TestContext.Current.CancellationToken);

            var responses = await Task.WhenAll(renameA, renameB);
            responses.All(r => r.StatusCode == HttpStatusCode.OK).Should().BeTrue();

            await WithDbContextAsync(async context =>
            {
                var file = await context.Set<FileEntity>()
                    .SingleAsync(f => f.Id == fileId, cancellationToken: TestContext.Current.CancellationToken);
                file.FileName.Should().BeOneOf("alpha.txt", "beta.txt");
            });
        }

        [Fact]
        public async Task ConcurrentProfilePhotoUpdates_LastWriteWins_DeletesOld()
        {
            var token = await RegisterAndLoginAsync("concurrent_photo", "Pass123!", "concurrent_photo@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var storageRoot = await GetStorageRootAsync();
            var photosDir = System.IO.Path.Combine(storageRoot, "photos");
            System.IO.Directory.CreateDirectory(photosDir);
            var beforeFiles = System.IO.Directory.GetFiles(photosDir)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var initialPhoto = BuildFakeJpeg(0x11);
            var initialResponse = await UploadPhotoAsync(Client, initialPhoto, TestContext.Current.CancellationToken);
            initialResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            Guid initialGuid = Guid.Empty;
            await WithDbContextAsync(async context =>
            {
                var user = await context.Set<ApplicationUser>()
                    .SingleAsync(u => u.UserName == "concurrent_photo", TestContext.Current.CancellationToken);
                initialGuid = user.PhotoFileGuid!.Value;
            });

            var initialPath = System.IO.Path.Combine(photosDir, initialGuid.ToString());
            File.Exists(initialPath).Should().BeTrue();

            var photoA = BuildFakeJpeg(0x21);
            var photoB = BuildFakeJpeg(0x31);

            var uploadA = UploadPhotoWithCompletionAsync(photoA, TestContext.Current.CancellationToken);
            var uploadB = UploadPhotoWithCompletionAsync(photoB, TestContext.Current.CancellationToken);

            var uploads = await Task.WhenAll(uploadA, uploadB);
            uploads.All(u => u.StatusCode == HttpStatusCode.OK).Should().BeTrue();

            var winner = uploads.OrderBy(u => u.CompletedAt).Last();

            var meResponse = await Client.GetAsync("/api/User/Me", TestContext.Current.CancellationToken);
            meResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var me = await meResponse.Content.ReadFromJsonAsync<AppUserResponse>(cancellationToken: TestContext.Current.CancellationToken);
            me.Should().NotBeNull();
            me!.PhotoUrl.Should().NotBeNullOrWhiteSpace();

            var photoResponse = await Client.GetAsync(me.PhotoUrl!, TestContext.Current.CancellationToken);
            photoResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var storedBytes = await photoResponse.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken);
            storedBytes.Should().Equal(winner.Content);

            File.Exists(initialPath).Should().BeFalse();

            var afterFiles = System.IO.Directory.GetFiles(photosDir)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
            var newFiles = afterFiles.Except(beforeFiles).ToArray();
            newFiles.Should().ContainSingle();
        }

        private async Task<(int FileId, int ChunkSize, int NumberOfChunks)> StartUploadWithInfoAsync(string fileName, int sizeBytes,
            int? parentId = null, CancellationToken token = default)
        {
            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = fileName,
                Size = sizeBytes,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream",
                ParentId = parentId
            }, token);

            var chunkSize = 0;
            var numberOfChunks = 0;

            await WithDbContextAsync(async context =>
            {
                var entity = await context.Set<FileEntity>()
                    .Include(f => f.PartialFileInfo)
                    .SingleAsync(f => f.Id == file.Id, cancellationToken: token);

                chunkSize = entity.PartialFileInfo!.ChunkSize;
                numberOfChunks = entity.PartialFileInfo.NumberOfChunks;
            });

            return (file.Id, chunkSize, numberOfChunks);
        }

        private static byte[] GetChunk(byte[] content, int chunkIndex, int chunkSize)
        {
            var offset = chunkIndex * chunkSize;
            var remaining = content.Length - offset;
            var length = remaining > chunkSize ? chunkSize : remaining;

            var chunk = new byte[length];
            Array.Copy(content, offset, chunk, 0, length);
            return chunk;
        }

        private static async Task<HttpResponseMessage> UploadChunkAsync(HttpClient client, int fileId, int chunkIndex, byte[] content,
            CancellationToken token = default)
        {
            using var form = new MultipartFormDataContent();
            using var chunkContent = new ByteArrayContent(content);
            form.Add(chunkContent, "chunk", "chunk.bin");

            return await client.PutAsync($"/api/Upload/{fileId}/Chunk/{chunkIndex}", form, token);
        }

        private async Task AssertStoredFileEqualsAsync(int fileId, byte[] expected, CancellationToken token = default)
        {
            var storageRoot = await GetStorageRootAsync();
            Guid fileGuid = Guid.Empty;
            await WithDbContextAsync(async context =>
            {
                var file = await context.Set<FileEntity>().FindAsync(new object[] { fileId }, token);
                fileGuid = file!.FileGuid!.Value;
            });

            var filePath = System.IO.Path.Combine(storageRoot, fileGuid.ToString());
            var actual = await File.ReadAllBytesAsync(filePath, token);
            actual.Should().Equal(expected);
        }

        private async Task<int> UploadSingleChunkAsync(string fileName, int sizeBytes, int? parentId = null, CancellationToken token = default)
        {
            var content = new byte[sizeBytes];
            new Random(19).NextBytes(content);

            var file = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = fileName,
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream",
                ParentId = parentId
            }, token);

            await UploadSingleChunkAsync(file.Id, content, token);
            await CompleteUploadAsync(file.Id, token);

            return file.Id;
        }

        private async Task<(HttpStatusCode StatusCode, int? FileId)> TryUploadSingleChunkAsync(string fileName, int sizeBytes,
            CancellationToken token = default)
        {
            var content = new byte[sizeBytes];
            new Random(23).NextBytes(content);

            var startResponse = await Client.PostAsJsonAsync("/api/Upload/Start", new UploadFileInfoRequest
            {
                FileName = fileName,
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream"
            }, token);

            if (startResponse.StatusCode != HttpStatusCode.OK)
            {
                return (startResponse.StatusCode, null);
            }

            var file = await startResponse.Content.ReadFromJsonAsync<FileResponse>(cancellationToken: token);
            if (file is null)
            {
                return (HttpStatusCode.BadRequest, null);
            }

            await UploadSingleChunkAsync(file.Id, content, token);
            await CompleteUploadAsync(file.Id, token);
            return (HttpStatusCode.OK, file.Id);
        }

        private async Task<(HttpClient Client, HttpResponseMessage Response, int FileId, string FileName, byte[] Content)>
            StartUploadForClientAsync(HttpClient client, int parentId, string fileName, CancellationToken token = default)
        {
            var content = new byte[64 * 1024];
            new Random(31).NextBytes(content);

            var response = await client.PostAsJsonAsync("/api/Upload/Start", new UploadFileInfoRequest
            {
                FileName = fileName,
                Size = content.Length,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "application/octet-stream",
                ParentId = parentId
            }, token);

            if (response.StatusCode != HttpStatusCode.OK)
            {
                return (client, response, 0, string.Empty, content);
            }

            var file = await response.Content.ReadFromJsonAsync<FileIdNameResponse>(cancellationToken: token);
            var actualFileName = file?.FileName ?? string.Empty;
            var fileId = file?.Id ?? 0;
            return (client, response, fileId, actualFileName, content);
        }

        private async Task UploadSingleChunkAndCompleteAsync(HttpClient client, int fileId, byte[] content, CancellationToken token = default)
        {
            using var form = new MultipartFormDataContent();
            using var chunkContent = new ByteArrayContent(content);
            form.Add(chunkContent, "chunk", "chunk.bin");

            var chunkResponse = await client.PutAsync($"/api/Upload/{fileId}/Chunk/0", form, token);
            chunkResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var completeResponse = await client.PutAsync($"/api/Upload/{fileId}/Complete", content: null, cancellationToken: token);
            completeResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        private HttpClient CreateAuthenticatedClient(string token)
        {
            var client = CreateAnonymousClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return client;
        }

        private static async Task<HttpResponseMessage> UploadPhotoAsync(HttpClient client, byte[] bytes, CancellationToken token = default)
        {
            using var content = CreatePhotoContent(bytes, "image/jpeg");
            return await client.PutAsync("/api/User/Me/Photo", content, token);
        }

        private async Task<(DateTime CompletedAt, HttpStatusCode StatusCode, byte[] Content)>
            UploadPhotoWithCompletionAsync(byte[] bytes, CancellationToken token = default)
        {
            var response = await UploadPhotoAsync(Client, bytes, token);
            return (DateTime.UtcNow, response.StatusCode, bytes);
        }

        private static MultipartFormDataContent CreatePhotoContent(byte[] bytes, string contentType)
        {
            var content = new MultipartFormDataContent();
            var photo = new ByteArrayContent(bytes);
            photo.Headers.ContentType = new MediaTypeHeaderValue(contentType);
            content.Add(photo, "Photo", "photo.bin");
            return content;
        }

        private static byte[] BuildFakeJpeg(byte marker)
        {
            return new byte[]
            {
                0xFF, 0xD8, 0xFF, 0xE0,
                0x00, 0x10, 0x4A, 0x46,
                0x49, 0x46, 0x00, 0x01,
                0x01, 0x01, 0x00, 0x60,
                0x00, 0x60, 0x00, 0x00,
                marker,
                0xFF, 0xD9
            };
        }

        private async Task<string?> GetDownloadUrlAsync(int fileId, CancellationToken token = default)
        {
            var urlResponse = await Client.PostAsync($"/api/Download/url?fileIds={fileId}", content: null, cancellationToken: token);
            urlResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            return await ExtractDownloadUrlAsync(urlResponse, token);
        }

        private static async Task<string?> ExtractDownloadUrlAsync(HttpResponseMessage response, CancellationToken token = default)
        {
            var content = await response.Content.ReadAsStringAsync(token);
            var result = JsonSerializer.Deserialize<DownloadUrlResponse>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return result?.Url;
        }

        private static async Task WaitForFileDeletionAsync(string filePath, CancellationToken token = default)
        {
            for (var attempt = 0; attempt < 10; attempt++)
            {
                if (!File.Exists(filePath))
                {
                    return;
                }

                await Task.Delay(200, token);
            }
        }

        private sealed class FileIdNameResponse
        {
            public int Id { get; set; }
            public string FileName { get; set; } = string.Empty;
        }

        private sealed class DownloadUrlResponse
        {
            public string Url { get; set; } = string.Empty;
        }
    }
}