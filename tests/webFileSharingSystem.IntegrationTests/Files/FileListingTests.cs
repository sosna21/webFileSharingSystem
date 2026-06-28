using System;
using System.Net;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.IntegrationTests.Helpers;
using webFileSharingSystem.Web.Contracts.Requests;
using webFileSharingSystem.Web.Contracts.Responses;
using Xunit;

namespace webFileSharingSystem.IntegrationTests.Files
{
    public class FileListingTests(SqlServerContainerFixture dbFixture) : IntegrationTestBase(dbFixture)
    {
        private const int PageNumber = 1;
        private const int PageSize = 50;

        [Fact]
        public async Task GetAll_NoSearch_Root_ReturnsOnlyRootItems()
        {
            var token = await RegisterAndLoginAsync("file_list_root", "Pass123!", "file_list_root@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var rootDirA = await CreateDirectoryAsync("root-dir-a", token: TestContext.Current.CancellationToken);
            var rootDirB = await CreateDirectoryAsync("root-dir-b", token: TestContext.Current.CancellationToken);

            var rootFileAId = await UploadCompletedFileAsync("root-a.txt", parentId: null, token: TestContext.Current.CancellationToken);
            var rootFileBId = await UploadCompletedFileAsync("root-b.txt", parentId: null, token: TestContext.Current.CancellationToken);

            var nestedDir = await CreateDirectoryAsync("nested", rootDirA.Id, TestContext.Current.CancellationToken);
            var nestedFileId = await UploadCompletedFileAsync("nested-file.txt", nestedDir.Id, TestContext.Current.CancellationToken);

            var results = await GetAllAsync(parentId: null, token: TestContext.Current.CancellationToken);
            results.Items.Should().Contain(item => item.Id == rootDirA.Id);
            results.Items.Should().Contain(item => item.Id == rootDirB.Id);
            results.Items.Should().Contain(item => item.Id == rootFileAId);
            results.Items.Should().Contain(item => item.Id == rootFileBId);
            results.Items.Should().NotContain(item => item.Id == nestedFileId);
        }

        [Fact]
        public async Task GetAll_NoSearch_WithParentId_ReturnsDirectChildrenOnly()
        {
            var token = await RegisterAndLoginAsync("file_list_parent", "Pass123!", "file_list_parent@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var parent = await CreateDirectoryAsync("parent-dir", token: TestContext.Current.CancellationToken);
            var childDir = await CreateDirectoryAsync("child-dir", parent.Id, TestContext.Current.CancellationToken);

            var directFileId = await UploadCompletedFileAsync("direct.txt", parent.Id, TestContext.Current.CancellationToken);
            var nestedFileId = await UploadCompletedFileAsync("nested.txt", childDir.Id, TestContext.Current.CancellationToken);

            var results = await GetAllAsync(parent.Id, TestContext.Current.CancellationToken);
            results.Items.Should().Contain(item => item.Id == childDir.Id);
            results.Items.Should().Contain(item => item.Id == directFileId);
            results.Items.Should().NotContain(item => item.Id == nestedFileId);
        }

        [Fact]
        public async Task GetFavourites_NoSearch_ReturnsAllFavouriteFiles()
        {
            var token = await RegisterAndLoginAsync("file_list_fav", "Pass123!", "file_list_fav@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var rootFileId = await UploadCompletedFileAsync("fav-root.txt", parentId: null, token: TestContext.Current.CancellationToken);
            var dir = await CreateDirectoryAsync("fav-dir", token: TestContext.Current.CancellationToken);
            var nestedFileId = await UploadCompletedFileAsync("fav-nested.txt", dir.Id, TestContext.Current.CancellationToken);
            await UploadCompletedFileAsync("not-fav.txt", dir.Id, TestContext.Current.CancellationToken);

            await SetFavouriteAsync(rootFileId, true, TestContext.Current.CancellationToken);
            await SetFavouriteAsync(nestedFileId, true, TestContext.Current.CancellationToken);

            var results = await GetFavouritesAsync(TestContext.Current.CancellationToken);
            results.Items.Should().Contain(item => item.Id == rootFileId);
            results.Items.Should().Contain(item => item.Id == nestedFileId);
            results.Items.Should().NotContain(item => item.FileName == "not-fav.txt");
        }

        [Fact]
        public async Task GetRecent_NoSearch_ReturnsFilesOnly()
        {
            var token = await RegisterAndLoginAsync("file_list_recent", "Pass123!", "file_list_recent@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var rootFileId = await UploadCompletedFileAsync("recent-root.txt", parentId: null, token: TestContext.Current.CancellationToken);
            var dir = await CreateDirectoryAsync("recent-dir", token: TestContext.Current.CancellationToken);
            var nestedFileId = await UploadCompletedFileAsync("recent-nested.txt", dir.Id, TestContext.Current.CancellationToken);
            var directory = await CreateDirectoryAsync("recent-folder", dir.Id, TestContext.Current.CancellationToken);

            var results = await GetRecentAsync(TestContext.Current.CancellationToken);
            results.Items.Should().Contain(item => item.Id == rootFileId);
            results.Items.Should().Contain(item => item.Id == nestedFileId);
            results.Items.Should().NotContain(item => item.Id == directory.Id);
        }

        [Fact]
        public async Task GetSharedByMe_NoSearch_ReturnsActiveShares()
        {
            var ownerToken = await RegisterAndLoginAsync("file_list_shared_owner", "Pass123!", "file_list_shared_owner@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var dirA = await CreateDirectoryAsync("share-by-me-a", token: TestContext.Current.CancellationToken);
            var dirB = await CreateDirectoryAsync("share-by-me-b", token: TestContext.Current.CancellationToken);

            var appleId = await UploadCompletedFileAsync("shared-apple.txt", dirA.Id, TestContext.Current.CancellationToken);
            var bananaId = await UploadCompletedFileAsync("shared-banana.txt", dirB.Id, TestContext.Current.CancellationToken);

            await RegisterAndLoginAsync("file_list_shared_guest", "Pass123!", "file_list_shared_guest@example.com",
                TestContext.Current.CancellationToken);

            await AddShareAsync(appleId, new AddFileShareRequest
            {
                UserNameToShareWith = "file_list_shared_guest",
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);
            await AddShareAsync(bananaId, new AddFileShareRequest
            {
                UserNameToShareWith = "file_list_shared_guest",
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);

            var results = await GetSharedByMeAsync(TestContext.Current.CancellationToken);
            results.Items.Should().Contain(item => item.Id == appleId);
            results.Items.Should().Contain(item => item.Id == bananaId);
        }

        [Fact]
        public async Task GetSharedWithMe_NoSearch_Root_ReturnsSharedRoots()
        {
            var ownerToken = await RegisterAndLoginAsync("file_list_shared_with_owner", "Pass123!", "file_list_shared_with_owner@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var sharedRootA = await CreateDirectoryAsync("shared-root-a", token: TestContext.Current.CancellationToken);
            var sharedRootB = await CreateDirectoryAsync("shared-root-b", token: TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("file_list_shared_with_guest", "Pass123!", "file_list_shared_with_guest@example.com",
                TestContext.Current.CancellationToken);

            await AddShareAsync(sharedRootA.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "file_list_shared_with_guest",
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);
            await AddShareAsync(sharedRootB.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "file_list_shared_with_guest",
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);

            var results = await GetSharedWithMeAsync(parentId: null, token: TestContext.Current.CancellationToken);
            results.Items.Should().Contain(item => item.Id == sharedRootA.Id);
            results.Items.Should().Contain(item => item.Id == sharedRootB.Id);
        }

        [Fact]
        public async Task GetSharedWithMe_NoSearch_WithParentId_ReturnsDirectChildrenOnly()
        {
            var ownerToken = await RegisterAndLoginAsync("file_list_shared_with_parent_owner", "Pass123!",
                "file_list_shared_with_parent_owner@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var parent = await CreateDirectoryAsync("shared-parent", token: TestContext.Current.CancellationToken);
            var childDir = await CreateDirectoryAsync("shared-child", parent.Id, TestContext.Current.CancellationToken);
            var directFileId = await UploadCompletedFileAsync("shared-direct.txt", parent.Id, TestContext.Current.CancellationToken);
            var nestedFileId = await UploadCompletedFileAsync("shared-nested.txt", childDir.Id, TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("file_list_shared_with_parent_guest", "Pass123!",
                "file_list_shared_with_parent_guest@example.com", TestContext.Current.CancellationToken);

            await AddShareAsync(parent.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "file_list_shared_with_parent_guest",
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);

            var results = await GetSharedWithMeAsync(parent.Id, TestContext.Current.CancellationToken);
            results.Items.Should().Contain(item => item.Id == childDir.Id);
            results.Items.Should().Contain(item => item.Id == directFileId);
            results.Items.Should().NotContain(item => item.Id == nestedFileId);
        }

        private async Task<int> UploadCompletedFileAsync(string fileName, int? parentId = null, CancellationToken token = default)
        {
            var content = new byte[16 * 1024];
            new Random(17).NextBytes(content);

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

        private async Task SetFavouriteAsync(int fileId, bool value, CancellationToken token = default)
        {
            var response = await Client.PutAsync($"/api/File/SetFavourite/{fileId}?value={value}", content: null, cancellationToken: token);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        private async Task<PaginatedListResponse<FileResponse>> GetAllAsync(int? parentId, CancellationToken token = default)
        {
            var url = $"/api/File/GetAll?PageNumber={PageNumber}&PageSize={PageSize}";
            if (parentId.HasValue)
            {
                url += $"&ParentId={parentId.Value}";
            }

            return await GetFileListAsync(url, token);
        }

        private async Task<PaginatedListResponse<FileResponse>> GetFavouritesAsync(CancellationToken token = default)
        {
            var url = $"/api/File/GetFavourites?PageNumber={PageNumber}&PageSize={PageSize}";
            return await GetFileListAsync(url, token);
        }

        private async Task<PaginatedListResponse<FileResponse>> GetRecentAsync(CancellationToken token = default)
        {
            var url = $"/api/File/GetRecent?PageNumber={PageNumber}&PageSize={PageSize}";
            return await GetFileListAsync(url, token);
        }

        private async Task<PaginatedListResponse<FileResponse>> GetSharedByMeAsync(CancellationToken token = default)
        {
            var url = $"/api/File/GetSharedByMe?PageNumber={PageNumber}&PageSize={PageSize}";
            return await GetFileListAsync(url, token);
        }

        private async Task<PaginatedListResponse<SharedFileResponse>> GetSharedWithMeAsync(int? parentId, CancellationToken token = default)
        {
            var url = $"/api/File/GetSharedWithMe?PageNumber={PageNumber}&PageSize={PageSize}";
            if (parentId.HasValue)
            {
                url += $"&ParentId={parentId.Value}";
            }

            return await GetSharedFileListAsync(url, token);
        }

        private async Task<PaginatedListResponse<FileResponse>> GetFileListAsync(string url, CancellationToken token = default)
        {
            var response = await Client.GetAsync(url, token);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var list = await response.Content.ReadFromJsonAsync<PaginatedListResponse<FileResponse>>(cancellationToken: token);
            list.Should().NotBeNull();
            return list!;
        }

        private async Task<PaginatedListResponse<SharedFileResponse>> GetSharedFileListAsync(string url, CancellationToken token = default)
        {
            var response = await Client.GetAsync(url, token);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var list = await response.Content.ReadFromJsonAsync<PaginatedListResponse<SharedFileResponse>>(cancellationToken: token);
            list.Should().NotBeNull();
            return list!;
        }

        private sealed class PaginatedListResponse<T>
        {
            public T[] Items { get; set; } = Array.Empty<T>();
        }
    }
}