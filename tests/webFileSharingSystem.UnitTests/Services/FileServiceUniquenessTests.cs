using System;
using System.Linq;
using System.Threading.Tasks;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Services;
using webFileSharingSystem.UnitTests.Helpers;
using Xunit;

namespace webFileSharingSystem.UnitTests.Services
{
    public class FileServiceUniquenessTests
    {
        [Fact]
        public async Task RenameFileAsync_WhenNameExistsInSameFolder_ReturnsFailure()
        {
            var unitOfWork = new FakeUnitOfWork();
            var fileRepo = unitOfWork.GetRepository<File>();

            var fileA = new File { UserId = 1, FileName = "alpha.txt" };
            var fileB = new File { UserId = 1, FileName = "bravo.txt" };
            fileRepo.Add(fileA);
            fileRepo.Add(fileB);

            var service = CreateService(unitOfWork);

            var result = await service.RenameFileAsync(fileA.Id, 1, "bravo.txt");

            Assert.False(result.Succeeded);
            Assert.Equal(OperationResult.BadRequest, result.Status);
            Assert.Equal("alpha.txt", fileA.FileName);
        }

        [Fact]
        public async Task MoveFilesAsync_WhenNameExistsInTarget_AddsCounterSuffix()
        {
            var unitOfWork = new FakeUnitOfWork();
            var fileRepo = unitOfWork.GetRepository<File>();

            var sourceFolder = new File { UserId = 1, FileName = "Source", IsDirectory = true };
            var targetFolder = new File { UserId = 1, FileName = "Target", IsDirectory = true };
            fileRepo.Add(sourceFolder);
            fileRepo.Add(targetFolder);

            var existingTargetFile = new File
            {
                UserId = 1,
                ParentId = targetFolder.Id,
                FileName = "report.txt"
            };
            fileRepo.Add(existingTargetFile);

            var fileToMove = new File
            {
                UserId = 1,
                ParentId = sourceFolder.Id,
                FileName = "report.txt"
            };
            fileRepo.Add(fileToMove);

            var service = CreateService(unitOfWork);

            var result = await service.MoveFilesAsync(targetFolder.Id, new[] { fileToMove.Id }, 1);

            Assert.True(result.Item1.Succeeded);
            Assert.Equal(targetFolder.Id, fileToMove.ParentId);
            Assert.Equal("report (1).txt", fileToMove.FileName);
        }

        [Fact]
        public async Task CopyFilesAsync_WhenCopyingDirectoryToSameParent_UsesCopySuffix()
        {
            var unitOfWork = new FakeUnitOfWork();
            var fileRepo = unitOfWork.GetRepository<File>();
            var userRepo = unitOfWork.GetRepository<ApplicationUser>();

            var owner = new ApplicationUser("owner", null, "id", quota: 1024 * 1024);
            userRepo.Add(owner);

            var folder = new File { UserId = owner.Id, FileName = "Folder", IsDirectory = true };
            fileRepo.Add(folder);

            var child = new File
            {
                UserId = owner.Id,
                ParentId = folder.Id,
                FileName = "child.txt"
            };
            fileRepo.Add(child);

            var service = CreateService(unitOfWork);

            var result = await service.CopyFilesAsync(null, new[] { folder.Id }, owner.Id);

            Assert.True(result.Item1.Succeeded);
            var copiedFolder = result.Item2?.Single();
            Assert.NotNull(copiedFolder);
            Assert.Equal("Folder - Copy", copiedFolder!.File.FileName);
        }

        [Fact]
        public async Task CopyFilesAsync_WhenNoConflict_KeepsOriginalName()
        {
            var unitOfWork = new FakeUnitOfWork();
            var fileRepo = unitOfWork.GetRepository<File>();
            var userRepo = unitOfWork.GetRepository<ApplicationUser>();

            var owner = new ApplicationUser("owner", null, "id", quota: 1024 * 1024);
            userRepo.Add(owner);

            var targetFolder = new File { UserId = owner.Id, FileName = "Target", IsDirectory = true };
            fileRepo.Add(targetFolder);

            var fileToCopy = new File { UserId = owner.Id, FileName = "notes.txt" };
            fileRepo.Add(fileToCopy);

            var service = CreateService(unitOfWork);

            var result = await service.CopyFilesAsync(targetFolder.Id, new[] { fileToCopy.Id }, owner.Id);

            Assert.True(result.Item1.Succeeded);
            var copiedFile = result.Item2?.Single();
            Assert.NotNull(copiedFile);
            Assert.Equal("notes.txt", copiedFile!.File.FileName);
        }

        private static FileService CreateService(FakeUnitOfWork unitOfWork)
        {
            return new FileService(
                unitOfWork,
                new AllowAllGuardService(),
                new NoOpFilePersistenceService(),
                new NoOpUploadService(),
                new NoOpUserLocks());
        }
    }
}
