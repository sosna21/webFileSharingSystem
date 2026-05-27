using System;
using System.Linq;
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
    public class FileCrudTests(SqlServerContainerFixture dbFixture) : IntegrationTestBase(dbFixture)
    {
        [Fact]
        public async Task CreateDirectory_WhenNameExists_AppendsCounter()
        {
            var token = await RegisterAndLoginAsync("file_crud_create_dupe", "Pass123!", "file_crud_create_dupe@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var first = await CreateDirectoryAsync("projects", token: TestContext.Current.CancellationToken);
            var second = await CreateDirectoryAsync("projects", token: TestContext.Current.CancellationToken);

            first.FileName.Should().Be("projects");
            second.FileName.Should().Be("projects (1)");
            second.Id.Should().NotBe(first.Id);
        }

        [Fact]
        public async Task CreateDirectory_WhenParentIsFile_ReturnsBadRequest()
        {
            var token = await RegisterAndLoginAsync("file_crud_create_parent_file", "Pass123!",
                "file_crud_create_parent_file@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var parentFileId = await UploadCompletedFileAsync("parent.bin", token: TestContext.Current.CancellationToken);

            var response = await Client.PostAsync($"/api/File/CreateDir/child?parentId={parentFileId}", content: null,
                cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task CreateDirectory_ReadOnlySharedParent_ReturnsUnauthorized()
        {
            var ownerToken = await RegisterAndLoginAsync("file_crud_shared_owner", "Pass123!",
                "file_crud_shared_owner@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var sharedRoot = await CreateDirectoryAsync("shared-root", token: TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("file_crud_shared_guest", "Pass123!", "file_crud_shared_guest@example.com",
                TestContext.Current.CancellationToken);

            await AddShareAsync(sharedRoot.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "file_crud_shared_guest",
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);

            var response = await Client.PostAsync($"/api/File/CreateDir/child?parentId={sharedRoot.Id}", content: null,
                cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task CreateDirectory_ReadWriteSharedParent_ReturnsSharedResponse()
        {
            var ownerToken = await RegisterAndLoginAsync("file_crud_shared_rw_owner", "Pass123!",
                "file_crud_shared_rw_owner@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var sharedRoot = await CreateDirectoryAsync("shared-root-rw", token: TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("file_crud_shared_rw_guest", "Pass123!",
                "file_crud_shared_rw_guest@example.com", TestContext.Current.CancellationToken);

            await AddShareAsync(sharedRoot.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "file_crud_shared_rw_guest",
                AccessMode = ShareAccessMode.ReadWrite
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);

            var response = await Client.PostAsync($"/api/File/CreateDir/child?parentId={sharedRoot.Id}", content: null,
                cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var shared = await response.Content.ReadFromJsonAsync<SharedFileResponse>(cancellationToken: TestContext.Current.CancellationToken);
            shared.Should().NotBeNull();
            shared!.ParentId.Should().Be(sharedRoot.Id);
            shared.AccessMode.Should().Be(ShareAccessMode.ReadWrite);
        }

        [Fact]
        public async Task Rename_WhenNameExistsInParent_ReturnsBadRequest()
        {
            var token = await RegisterAndLoginAsync("file_crud_rename_dupe", "Pass123!", "file_crud_rename_dupe@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var first = await CreateDirectoryAsync("alpha", token: TestContext.Current.CancellationToken);
            var second = await CreateDirectoryAsync("bravo", token: TestContext.Current.CancellationToken);

            var response = await Client.PutAsync($"/api/File/Rename/{first.Id}?name={second.FileName}", content: null,
                cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task Rename_ReadWriteSharedParent_WhenNameExists_ReturnsBadRequest()
        {
            var ownerToken = await RegisterAndLoginAsync("file_crud_rename_rw_conflict_owner", "Pass123!",
                "file_crud_rename_rw_conflict_owner@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var sharedRoot = await CreateDirectoryAsync("shared-rename-conflict", token: TestContext.Current.CancellationToken);
            var alphaId = await UploadCompletedFileAsync("alpha.txt", sharedRoot.Id, TestContext.Current.CancellationToken);
            await UploadCompletedFileAsync("beta.txt", sharedRoot.Id, TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("file_crud_rename_rw_conflict_guest", "Pass123!",
                "file_crud_rename_rw_conflict_guest@example.com", TestContext.Current.CancellationToken);

            await AddShareAsync(sharedRoot.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "file_crud_rename_rw_conflict_guest",
                AccessMode = ShareAccessMode.ReadWrite
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);

            var response = await Client.PutAsync($"/api/File/Rename/{alphaId}?name=beta.txt", content: null,
                cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task Rename_WhenNameUnchanged_ReturnsOkAndNoChange()
        {
            var token = await RegisterAndLoginAsync("file_crud_rename_noop", "Pass123!", "file_crud_rename_noop@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var fileId = await UploadCompletedFileAsync("noop.txt", token: TestContext.Current.CancellationToken);

            var response = await Client.PutAsync($"/api/File/Rename/{fileId}?name=noop.txt", content: null,
                cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var files = await GetFilesAsync(parentId: null, TestContext.Current.CancellationToken);
            files.Items.Should().ContainSingle(item => item.Id == fileId && item.FileName == "noop.txt");
        }

        [Fact]
        public async Task Rename_ReadWriteSharedParent_AllowsGuestRename()
        {
            var ownerToken = await RegisterAndLoginAsync("file_crud_rename_rw_owner", "Pass123!",
                "file_crud_rename_rw_owner@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var sharedRoot = await CreateDirectoryAsync("shared-rename-root", token: TestContext.Current.CancellationToken);
            var fileId = await UploadCompletedFileAsync("shared-rename.txt", sharedRoot.Id, TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("file_crud_rename_rw_guest", "Pass123!",
                "file_crud_rename_rw_guest@example.com", TestContext.Current.CancellationToken);

            await AddShareAsync(sharedRoot.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "file_crud_rename_rw_guest",
                AccessMode = ShareAccessMode.ReadWrite
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);

            var response = await Client.PutAsync($"/api/File/Rename/{fileId}?name=renamed.txt", content: null,
                cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            SetBearerToken(ownerToken);
            var files = await GetFilesAsync(sharedRoot.Id, TestContext.Current.CancellationToken);
            files.Items.Should().ContainSingle(item => item.Id == fileId && item.FileName == "renamed.txt");
        }

        [Fact]
        public async Task Copy_WhenNameExistsInTarget_UsesCopySuffix()
        {
            var token = await RegisterAndLoginAsync("file_crud_copy_conflict", "Pass123!",
                "file_crud_copy_conflict@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var targetDir = await CreateDirectoryAsync("copy-target", token: TestContext.Current.CancellationToken);
            await UploadCompletedFileAsync("report.txt", targetDir.Id, TestContext.Current.CancellationToken);

            var sourceId = await UploadCompletedFileAsync("report.txt", token: TestContext.Current.CancellationToken);

            var response = await Client.PostAsJsonAsync($"/api/File/Copy/{targetDir.Id}", new[] { sourceId },
                cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var copied = await response.Content.ReadFromJsonAsync<FileResponse[]>(cancellationToken: TestContext.Current.CancellationToken);
            copied.Should().NotBeNull();
            copied!.Should().ContainSingle();
            copied![0].FileName.Should().Be("report - Copy.txt");
        }

        [Fact]
        public async Task Copy_ReadWriteSharedParent_AllowsGuestCopy()
        {
            var ownerToken = await RegisterAndLoginAsync("file_crud_copy_rw_owner", "Pass123!",
                "file_crud_copy_rw_owner@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var sharedRoot = await CreateDirectoryAsync("shared-copy-root", token: TestContext.Current.CancellationToken);
            var sourceId = await UploadCompletedFileAsync("shared-report.txt", sharedRoot.Id, TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("file_crud_copy_rw_guest", "Pass123!",
                "file_crud_copy_rw_guest@example.com", TestContext.Current.CancellationToken);

            await AddShareAsync(sharedRoot.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "file_crud_copy_rw_guest",
                AccessMode = ShareAccessMode.ReadWrite
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);
            var response = await Client.PostAsJsonAsync($"/api/File/Copy/{sharedRoot.Id}", new[] { sourceId },
                cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var copied = await response.Content.ReadFromJsonAsync<SharedFileResponse[]>(cancellationToken: TestContext.Current.CancellationToken);
            copied.Should().NotBeNull();
            copied!.Should().ContainSingle();
            copied[0].FileName.Should().Be("shared-report - Copy.txt");
            copied[0].AccessMode.Should().Be(ShareAccessMode.ReadWrite);
        }

        [Fact]
        public async Task Copy_ToReadOnlySharedTarget_ReturnsUnauthorized()
        {
            var ownerToken = await RegisterAndLoginAsync("file_crud_copy_ro_owner", "Pass123!",
                "file_crud_copy_ro_owner@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var sourceRoot = await CreateDirectoryAsync("shared-copy-source", token: TestContext.Current.CancellationToken);
            var targetRoot = await CreateDirectoryAsync("shared-copy-target", token: TestContext.Current.CancellationToken);
            var sourceId = await UploadCompletedFileAsync("copy-me.txt", sourceRoot.Id, TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("file_crud_copy_ro_guest", "Pass123!",
                "file_crud_copy_ro_guest@example.com", TestContext.Current.CancellationToken);

            await AddShareAsync(sourceRoot.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "file_crud_copy_ro_guest",
                AccessMode = ShareAccessMode.ReadWrite
            }, TestContext.Current.CancellationToken);
            await AddShareAsync(targetRoot.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "file_crud_copy_ro_guest",
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);
            var response = await Client.PostAsJsonAsync($"/api/File/Copy/{targetRoot.Id}", new[] { sourceId },
                cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Move_WhenNameExistsInTarget_UsesCounterSuffix()
        {
            var token = await RegisterAndLoginAsync("file_crud_move_conflict", "Pass123!",
                "file_crud_move_conflict@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var targetDir = await CreateDirectoryAsync("move-target", token: TestContext.Current.CancellationToken);
            await UploadCompletedFileAsync("report.txt", targetDir.Id, TestContext.Current.CancellationToken);

            var sourceId = await UploadCompletedFileAsync("report.txt", token: TestContext.Current.CancellationToken);

            var response = await Client.PutAsJsonAsync($"/api/File/Move/{targetDir.Id}", new[] { sourceId },
                cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var moved = await response.Content.ReadFromJsonAsync<FileResponse[]>(cancellationToken: TestContext.Current.CancellationToken);
            moved.Should().NotBeNull();
            moved!.Should().ContainSingle();
            moved[0].FileName.Should().Be("report (1).txt");
        }

        [Fact]
        public async Task Move_ReadWriteSharedParent_AllowsGuestMove()
        {
            var ownerToken = await RegisterAndLoginAsync("file_crud_move_rw_owner", "Pass123!",
                "file_crud_move_rw_owner@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var sharedRoot = await CreateDirectoryAsync("shared-move-root", token: TestContext.Current.CancellationToken);
            var targetDir = await CreateDirectoryAsync("shared-move-target", sharedRoot.Id, TestContext.Current.CancellationToken);
            var sourceId = await UploadCompletedFileAsync("shared-move.txt", sharedRoot.Id, TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("file_crud_move_rw_guest", "Pass123!",
                "file_crud_move_rw_guest@example.com", TestContext.Current.CancellationToken);

            await AddShareAsync(sharedRoot.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "file_crud_move_rw_guest",
                AccessMode = ShareAccessMode.ReadWrite
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);
            var response = await Client.PutAsJsonAsync($"/api/File/Move/{targetDir.Id}", new[] { sourceId },
                cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            SetBearerToken(ownerToken);
            var files = await GetFilesAsync(targetDir.Id, TestContext.Current.CancellationToken);
            files.Items.Should().ContainSingle(item => item.Id == sourceId && item.ParentId == targetDir.Id);
        }

        [Fact]
        public async Task Move_ToReadOnlySharedTarget_ReturnsUnauthorized()
        {
            var ownerToken = await RegisterAndLoginAsync("file_crud_move_ro_owner", "Pass123!",
                "file_crud_move_ro_owner@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(ownerToken);

            var sourceRoot = await CreateDirectoryAsync("shared-move-source", token: TestContext.Current.CancellationToken);
            var targetRoot = await CreateDirectoryAsync("shared-move-target", token: TestContext.Current.CancellationToken);
            var sourceId = await UploadCompletedFileAsync("move-me.txt", sourceRoot.Id, TestContext.Current.CancellationToken);

            var guestToken = await RegisterAndLoginAsync("file_crud_move_ro_guest", "Pass123!",
                "file_crud_move_ro_guest@example.com", TestContext.Current.CancellationToken);

            await AddShareAsync(sourceRoot.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "file_crud_move_ro_guest",
                AccessMode = ShareAccessMode.ReadWrite
            }, TestContext.Current.CancellationToken);
            await AddShareAsync(targetRoot.Id, new AddFileShareRequest
            {
                UserNameToShareWith = "file_crud_move_ro_guest",
                AccessMode = ShareAccessMode.ReadOnly
            }, TestContext.Current.CancellationToken);

            SetBearerToken(guestToken);
            var response = await Client.PutAsJsonAsync($"/api/File/Move/{targetRoot.Id}", new[] { sourceId },
                cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Move_WhenTargetIsFile_ReturnsBadRequest()
        {
            var token = await RegisterAndLoginAsync("file_crud_move_target_file", "Pass123!",
                "file_crud_move_target_file@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var targetFileId = await UploadCompletedFileAsync("target.bin", token: TestContext.Current.CancellationToken);
            var sourceId = await UploadCompletedFileAsync("source.bin", token: TestContext.Current.CancellationToken);

            var response = await Client.PutAsJsonAsync($"/api/File/Move/{targetFileId}", new[] { sourceId },
                cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task Move_WhenTargetIsDescendant_ReturnsBadRequest()
        {
            var token = await RegisterAndLoginAsync("file_crud_move_descendant", "Pass123!",
                "file_crud_move_descendant@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var parent = await CreateDirectoryAsync("parent", token: TestContext.Current.CancellationToken);
            var child = await CreateDirectoryAsync("child", parent.Id, TestContext.Current.CancellationToken);

            var response = await Client.PutAsJsonAsync($"/api/File/Move/{child.Id}", new[] { parent.Id },
                cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task Move_ToRoot_WithConflict_UsesCounterSuffix()
        {
            var token = await RegisterAndLoginAsync("file_crud_move_root_conflict", "Pass123!",
                "file_crud_move_root_conflict@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(token);

            await UploadCompletedFileAsync("root.txt", token: TestContext.Current.CancellationToken);
            var folder = await CreateDirectoryAsync("move-root-folder", token: TestContext.Current.CancellationToken);
            var sourceId = await UploadCompletedFileAsync("root.txt", folder.Id, TestContext.Current.CancellationToken);

            var response = await Client.PutAsJsonAsync("/api/File/Move/-1", new[] { sourceId },
                cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var moved = await response.Content.ReadFromJsonAsync<FileResponse[]>(cancellationToken: TestContext.Current.CancellationToken);
            moved.Should().NotBeNull();
            moved!.Should().ContainSingle();
            moved![0].FileName.Should().Be("root (1).txt");
            moved[0].ParentId.Should().BeNull();
        }

        [Fact]
        public async Task Copy_ToRoot_WithConflict_UsesCopySuffix()
        {
            var token = await RegisterAndLoginAsync("file_crud_copy_root_conflict", "Pass123!",
                "file_crud_copy_root_conflict@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(token);

            await UploadCompletedFileAsync("root-copy.txt", token: TestContext.Current.CancellationToken);
            var folder = await CreateDirectoryAsync("copy-root-folder", token: TestContext.Current.CancellationToken);
            var sourceId = await UploadCompletedFileAsync("root-copy.txt", folder.Id, TestContext.Current.CancellationToken);

            var response = await Client.PostAsJsonAsync("/api/File/Copy/-1", new[] { sourceId },
                cancellationToken: TestContext.Current.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var copied = await response.Content.ReadFromJsonAsync<FileResponse[]>(cancellationToken: TestContext.Current.CancellationToken);
            copied.Should().NotBeNull();
            copied!.Should().ContainSingle();
            copied![0].FileName.Should().Be("root-copy - Copy.txt");
            copied[0].ParentId.Should().BeNull();
        }

        [Fact]
        public async Task StartUpload_WhenNameExists_AppendsCounter()
        {
            var token = await RegisterAndLoginAsync("file_crud_upload_dupe", "Pass123!", "file_crud_upload_dupe@example.com",
                TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var first = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "upload.txt",
                Size = 0,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "text/plain"
            }, TestContext.Current.CancellationToken);

            var second = await StartUploadAsync(new UploadFileInfoRequest
            {
                FileName = "upload.txt",
                Size = 0,
                LastModificationDate = DateTime.UtcNow,
                MimeType = "text/plain"
            }, TestContext.Current.CancellationToken);

            first.FileName.Should().Be("upload.txt");
            second.FileName.Should().Be("upload (1).txt");
        }

        [Fact]
        public async Task GetNames_Root_ReturnsDirectNamesOnly()
        {
            var token = await RegisterAndLoginAsync("file_crud_getnames_root", "Pass123!",
                "file_crud_getnames_root@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(token);

            await UploadCompletedFileAsync("root.txt", token: TestContext.Current.CancellationToken);
            var rootDir = await CreateDirectoryAsync("root-dir", token: TestContext.Current.CancellationToken);
            await UploadCompletedFileAsync("nested.txt", rootDir.Id, TestContext.Current.CancellationToken);

            var response = await Client.GetAsync("/api/File/GetNames/-1", TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var names = await response.Content.ReadFromJsonAsync<string[]>(cancellationToken: TestContext.Current.CancellationToken);
            names.Should().NotBeNull();
            names!.Should().Contain(new[] { "root.txt", "root-dir" });
            names.Should().NotContain("nested.txt");
        }

        [Fact]
        public async Task GetNames_WithParent_ReturnsDirectNamesOnly()
        {
            var token = await RegisterAndLoginAsync("file_crud_getnames_parent", "Pass123!",
                "file_crud_getnames_parent@example.com", TestContext.Current.CancellationToken);
            SetBearerToken(token);

            var parent = await CreateDirectoryAsync("parent-dir", token: TestContext.Current.CancellationToken);
            var child = await CreateDirectoryAsync("child-dir", parent.Id, TestContext.Current.CancellationToken);
            await UploadCompletedFileAsync("direct.txt", parent.Id, TestContext.Current.CancellationToken);
            await UploadCompletedFileAsync("nested.txt", child.Id, TestContext.Current.CancellationToken);

            var response = await Client.GetAsync($"/api/File/GetNames/{parent.Id}", TestContext.Current.CancellationToken);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var names = await response.Content.ReadFromJsonAsync<string[]>(cancellationToken: TestContext.Current.CancellationToken);
            names.Should().NotBeNull();
            names!.Should().Contain(new[] { "direct.txt", "child-dir" });
            names.Should().NotContain("nested.txt");
        }

        private async Task<int> UploadCompletedFileAsync(string fileName, int? parentId = null, CancellationToken token = default)
        {
            var content = new byte[8 * 1024];
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

        private async Task<PaginatedListResponse<FileResponse>> GetFilesAsync(int? parentId, CancellationToken token = default)
        {
            var url = "/api/File/GetAll?PageNumber=1&PageSize=50";
            if (parentId.HasValue)
            {
                url += $"&ParentId={parentId.Value}";
            }

            var response = await Client.GetAsync(url, token);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var list = await response.Content.ReadFromJsonAsync<PaginatedListResponse<FileResponse>>(cancellationToken: token);
            list.Should().NotBeNull();
            return list!;
        }

        private sealed class PaginatedListResponse<T>
        {
            public T[] Items { get; set; } = Array.Empty<T>();
        }
    }
}