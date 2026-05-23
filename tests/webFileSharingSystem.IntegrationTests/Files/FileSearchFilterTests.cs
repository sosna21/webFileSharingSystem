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
    public class FileSearchFilterTests(SqlServerContainerFixture dbFixture) : IntegrationTestBase(dbFixture)
    {
        private const int PageNumber = 1;
        private const int PageSize = 50;

        [Fact]
        public async Task GetAll_SearchWithParentId_ReturnsSubtreeMatches()
        {
            var token = await RegisterAndLoginAsync("file_search_all", "Pass123!", "file_search_all@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var parent = await CreateDirectoryAsync("parent-search", token: TestContext.Current.CancellationToken);
            var child = await CreateDirectoryAsync("child-search", parent.Id, TestContext.Current.CancellationToken);

            var directMatchId = await UploadCompletedFileAsync("match-direct.txt", parent.Id, TestContext.Current.CancellationToken);
            var nestedMatchId = await UploadCompletedFileAsync("match-nested.txt", child.Id, TestContext.Current.CancellationToken);
            await UploadCompletedFileAsync("other.txt", child.Id, TestContext.Current.CancellationToken);

            var results = await GetAllAsync(parent.Id, "match", TestContext.Current.CancellationToken);
            results.Items.Should().Contain(item => item.Id == directMatchId);
            results.Items.Should().Contain(item => item.Id == nestedMatchId);
            results.Items.Should().NotContain(item => item.FileName == "other.txt");
        }

        [Fact]
        public async Task GetAll_WithoutSearch_ReturnsDirectChildrenOnly()
        {
            var token = await RegisterAndLoginAsync("file_search_direct", "Pass123!", "file_search_direct@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var parent = await CreateDirectoryAsync("parent-direct", token: TestContext.Current.CancellationToken);
            var child = await CreateDirectoryAsync("child-direct", parent.Id, TestContext.Current.CancellationToken);

            var directFileId = await UploadCompletedFileAsync("direct.txt", parent.Id, TestContext.Current.CancellationToken);
            var nestedFileId = await UploadCompletedFileAsync("nested.txt", child.Id, TestContext.Current.CancellationToken);

            var results = await GetAllAsync(parent.Id, searchPhrase: null, token: TestContext.Current.CancellationToken);
            results.Items.Should().Contain(item => item.Id == child.Id);
            results.Items.Should().Contain(item => item.Id == directFileId);
            results.Items.Should().NotContain(item => item.Id == nestedFileId);
        }

        [Fact]
        public async Task GetFavourites_SearchFiltersByFileName()
        {
            var token = await RegisterAndLoginAsync("file_search_fav", "Pass123!", "file_search_fav@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var dirA = await CreateDirectoryAsync("fav-a", token: TestContext.Current.CancellationToken);
            var dirB = await CreateDirectoryAsync("fav-b", token: TestContext.Current.CancellationToken);

            var appleId = await UploadCompletedFileAsync("fav-apple.txt", dirA.Id, TestContext.Current.CancellationToken);
            var bananaId = await UploadCompletedFileAsync("fav-banana.txt", dirB.Id, TestContext.Current.CancellationToken);
            await UploadCompletedFileAsync("not-fav.txt", dirA.Id, TestContext.Current.CancellationToken);

            await SetFavouriteAsync(appleId, true, TestContext.Current.CancellationToken);
            await SetFavouriteAsync(bananaId, true, TestContext.Current.CancellationToken);

            var allFavourites = await GetFavouritesAsync(searchPhrase: null, token: TestContext.Current.CancellationToken);
            allFavourites.Items.Should().Contain(item => item.Id == appleId);
            allFavourites.Items.Should().Contain(item => item.Id == bananaId);
            allFavourites.Items.Should().NotContain(item => item.FileName == "not-fav.txt");

            var filtered = await GetFavouritesAsync("apple", TestContext.Current.CancellationToken);
            filtered.Items.Should().ContainSingle(item => item.Id == appleId);
        }

        [Fact]
        public async Task GetRecent_SearchFiltersByFileName()
        {
            var token = await RegisterAndLoginAsync("file_search_recent", "Pass123!", "file_search_recent@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var dirA = await CreateDirectoryAsync("recent-a", token: TestContext.Current.CancellationToken);
            var dirB = await CreateDirectoryAsync("recent-b", token: TestContext.Current.CancellationToken);

            var alphaId = await UploadCompletedFileAsync("recent-alpha.txt", dirA.Id, TestContext.Current.CancellationToken);
            var betaId = await UploadCompletedFileAsync("recent-beta.txt", dirB.Id, TestContext.Current.CancellationToken);
            await CreateDirectoryAsync("recent-folder", dirA.Id, TestContext.Current.CancellationToken);

            var recent = await GetRecentAsync(searchPhrase: null, token: TestContext.Current.CancellationToken);
            recent.Items.Should().Contain(item => item.Id == alphaId);
            recent.Items.Should().Contain(item => item.Id == betaId);
            recent.Items.Should().NotContain(item => item.FileName == "recent-folder");

            var filtered = await GetRecentAsync("alpha", TestContext.Current.CancellationToken);
            filtered.Items.Should().ContainSingle(item => item.Id == alphaId);
        }

        [Fact]
        public async Task GetSharedByMe_SearchFiltersByFileName()
        {
            var ownerToken = await RegisterAndLoginAsync("file_search_share_owner", "Pass123!", "file_search_share_owner@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var dirA = await CreateDirectoryAsync("share-a", token: TestContext.Current.CancellationToken);
            var dirB = await CreateDirectoryAsync("share-b", token: TestContext.Current.CancellationToken);

            var appleId = await UploadCompletedFileAsync("shared-apple.txt", dirA.Id, TestContext.Current.CancellationToken);
            var bananaId = await UploadCompletedFileAsync("shared-banana.txt", dirB.Id, TestContext.Current.CancellationToken);

            await RegisterAndLoginAsync("file_search_share_guest", "Pass123!", "file_search_share_guest@example.com",
                TestContext.Current.CancellationToken);

            await AddShareAsync(appleId, new AddFileShareRequest
            {
                UserNameToShareWith = "file_search_share_guest",
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);
            await AddShareAsync(bananaId, new AddFileShareRequest
            {
                UserNameToShareWith = "file_search_share_guest",
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);

            var sharedByMe = await GetSharedByMeAsync(searchPhrase: null, token: TestContext.Current.CancellationToken);
            sharedByMe.Items.Should().Contain(item => item.Id == appleId);
            sharedByMe.Items.Should().Contain(item => item.Id == bananaId);

            var filtered = await GetSharedByMeAsync("apple", TestContext.Current.CancellationToken);
            filtered.Items.Should().ContainSingle(item => item.Id == appleId);
        }

        [Fact]
        public async Task GetSharedWithMe_SearchWithParentId_ReturnsSubtreeMatches()
        {
            var ownerToken = await RegisterAndLoginAsync("file_search_shared_with_owner", "Pass123!", "file_search_shared_with_owner@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var parent = await CreateDirectoryAsync("shared-parent", token: TestContext.Current.CancellationToken);
            var child = await CreateDirectoryAsync("shared-child", parent.Id, TestContext.Current.CancellationToken);

            await UploadCompletedFileAsync("match-direct.txt", parent.Id, TestContext.Current.CancellationToken);
            var nestedMatchId = await UploadCompletedFileAsync("match-nested.txt", child.Id, TestContext.Current.CancellationToken);
            await UploadCompletedFileAsync("other.txt", child.Id, TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("file_search_shared_with_guest", "Pass123!", "file_search_shared_with_guest@example.com",
                TestContext.Current.CancellationToken);

            await AddShareAsync(parent.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "file_search_shared_with_guest",
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);

            var shared = await GetSharedWithMeAsync(parent.Id, "match", TestContext.Current.CancellationToken);
            shared.Items.Should().Contain(item => item.FileName == "match-direct.txt");
            shared.Items.Should().Contain(item => item.Id == nestedMatchId);
            shared.Items.Should().NotContain(item => item.FileName == "other.txt");
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

        private async Task<PaginatedListResponse<FileResponse>> GetAllAsync(int parentId, string? searchPhrase, CancellationToken token = default)
        {
            var url = $"/api/File/GetAll?PageNumber={PageNumber}&PageSize={PageSize}&ParentId={parentId}";
            if (!string.IsNullOrEmpty(searchPhrase))
            {
                url += $"&SearchedPhrase={Uri.EscapeDataString(searchPhrase)}";
            }

            return await GetFileListAsync(url, token);
        }

        private async Task<PaginatedListResponse<FileResponse>> GetFavouritesAsync(string? searchPhrase, CancellationToken token = default)
        {
            var url = $"/api/File/GetFavourites?PageNumber={PageNumber}&PageSize={PageSize}";
            if (!string.IsNullOrEmpty(searchPhrase))
            {
                url += $"&SearchedPhrase={Uri.EscapeDataString(searchPhrase)}";
            }

            return await GetFileListAsync(url, token);
        }

        private async Task<PaginatedListResponse<FileResponse>> GetRecentAsync(string? searchPhrase, CancellationToken token = default)
        {
            var url = $"/api/File/GetRecent?PageNumber={PageNumber}&PageSize={PageSize}";
            if (!string.IsNullOrEmpty(searchPhrase))
            {
                url += $"&SearchedPhrase={Uri.EscapeDataString(searchPhrase)}";
            }

            return await GetFileListAsync(url, token);
        }

        private async Task<PaginatedListResponse<FileResponse>> GetSharedByMeAsync(string? searchPhrase, CancellationToken token = default)
        {
            var url = $"/api/File/GetSharedByMe?PageNumber={PageNumber}&PageSize={PageSize}";
            if (!string.IsNullOrEmpty(searchPhrase))
            {
                url += $"&SearchedPhrase={Uri.EscapeDataString(searchPhrase)}";
            }

            return await GetFileListAsync(url, token);
        }

        private async Task<PaginatedListResponse<SharedFileResponse>> GetSharedWithMeAsync(int parentId, string? searchPhrase,
            CancellationToken token = default)
        {
            var url = $"/api/File/GetSharedWithMe?PageNumber={PageNumber}&PageSize={PageSize}&ParentId={parentId}";
            if (!string.IsNullOrEmpty(searchPhrase))
            {
                url += $"&SearchedPhrase={Uri.EscapeDataString(searchPhrase)}";
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