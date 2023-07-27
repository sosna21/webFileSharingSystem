using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Transactions;
using Microsoft.AspNetCore.Identity;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Interfaces;
using File = webFileSharingSystem.Core.Entities.File;

namespace webFileSharingSystem.Infrastructure.Data
{
    public class ApplicationDbContextSeed
    {
        private readonly ApplicationDbContext _applicationDbContext;

        private readonly UserManager<IdentityUser> _userManager;

        private readonly RoleManager<IdentityRole> _roleManager;

        private readonly IRepository<ApplicationUser> _applicationUserRepository;

        private readonly IRepository<File> _fileRepository;

        private readonly IFilePersistenceService _filePersistenceService;

        private static readonly Random Random = new();

        public ApplicationDbContextSeed(
            ApplicationDbContext applicationDbContext,
            UserManager<IdentityUser> userManager,
            RoleManager<IdentityRole> roleManager,
            IRepository<ApplicationUser> applicationUserRepository,
            IRepository<File> fileRepository,
            IFilePersistenceService filePersistenceService)
        {
            _applicationDbContext = applicationDbContext;
            _userManager = userManager;
            _roleManager = roleManager;
            _applicationUserRepository = applicationUserRepository;
            _fileRepository = fileRepository;
            _filePersistenceService = filePersistenceService;
        }

        public async Task SetTestUserDataAsync()
        {
            await CreateUser("Administrator", "Administrator", "Administrator1!", "administrator@localhost");
            await CreateUser("Administrator", "maciej@localhost", "Administrator1!", "maciej@localhost", 10);
            await CreateUser("Administrator", "stefan_stefan", "Administrator1!", numberOfFiles: 33);
        }

        private async Task CreateUser(
            string roleName,
            string userName,
            string password,
            string? email = null,
            int numberOfFiles = 50)
        {
            if (_roleManager.Roles.All(r => r.Name != roleName))
            {
                await CreateRoleAsync(roleName);
            }

            if (_userManager.Users.All(u => u.UserName != userName))
            {
                var user = new IdentityUser {UserName = userName, Email = email};
                using (var scope = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
                {
                    await _userManager.CreateAsync(user, password);
                    await _userManager.AddToRolesAsync(user, new[] {roleName});
                    ApplicationUser applicationUser = new ApplicationUser(user.UserName, user.Email, user.Id);
                    _applicationUserRepository.Add(applicationUser);
                    await _applicationDbContext.SaveChangesAsync();
                    
                    var userId = applicationUser.Id;
                    var totalSize = await GenerateUserRandomFiles(userId, numberOfFiles);
                    applicationUser.UsedSpace = totalSize;
                    applicationUser.Quota = Math.Max(53687091200, (ulong) (totalSize * 1.5));
                    _applicationUserRepository.Update(applicationUser);
                    await _applicationDbContext.SaveChangesAsync();
                    scope.Complete();
                }
            }
        }

        private async Task<ulong> GenerateUserRandomFiles(int userId, int numberOfFiles = 50)
        {
            var fileNames = GetRandomFileNames().Take(numberOfFiles);
            ulong totalSize = 0;
            foreach (var fileName in fileNames)
            {
                var isDirectory = GenerateRandomBoolean(10);
                (string? extension, string? mimeType) fileExtensionAndMineType = (null, null);
                if (!isDirectory)
                {
                    fileExtensionAndMineType = GenerateRandomExtensionAndMineType();
                }

                var file = new File
                {
                    FileName = string.Concat(fileName, fileExtensionAndMineType.extension),
                    MimeType = fileExtensionAndMineType.mimeType,
                    Size = isDirectory ? 0 : GenerateRandomSize(),
                    IsDirectory = isDirectory,
                    IsShared = false,
                    IsFavourite = GenerateRandomBoolean(25),
                    UserId = userId,
                    FileGuid = Guid.NewGuid()
                };
                _fileRepository.Add(file);
                totalSize += file.Size;
                
                await _filePersistenceService.GenerateNewFile(userId, file.FileGuid!.Value);
                var fileLength = 1024^2;
                await using (var data = new MemoryStream())
                {
                    data.SetLength(fileLength);
                    await _filePersistenceService.SaveChunk(userId, file.FileGuid!.Value, 0, fileLength, data);
                }
                
                await _filePersistenceService.CommitSavedChunks(userId, file.FileGuid!.Value, new[] {0}, null, true);
            }

            return totalSize;
        }

        private async Task CreateRoleAsync(string roleName)
        {
            var role = new IdentityRole(roleName);
            await _roleManager.CreateAsync(role);
        }

        private static IEnumerable<string> GetRandomFileNames()
        {
            var fileNames = new[]
            {
                "marvina_black", "Davida vast blond", "canada", "pretty violent vast", "Jo Cornwall", "Taura+cream",
                "Alberte arrogant loving", "yellow cream", "Cornwall ginger", "Ireland", "Angie brunette",
                "Alberte red", "Laurence_green", "Zlatica-modest-handsome", "Mark Scotland",
                "purple blond red green", "Larry Greenbeard", "Laurence Boldbrand", "Laurence Purplehate",
                "Modest Zlatica", "Victorine+scheming", "Australia blue", "Faustine blonde", "Stephen King",
                "lovable yellow", "Scheming Victorine Yellow", "Considerate Victorine",
                "First Mate Victorine The Considerate", "The Lovable Pirate", "Dread Pirate Tosia",
                "Stephen Bluebeard", "fat Scotlabd", "remarkable=patient", "Alan Donald", "Jude black",
                "Scotland place", "Fat Al Blond", "Alan Yellowhate", "Sir+Jude+Fat",
                "First Mate Donald The Remarkable", "Cutthroat Dai The Articulate", "The Controlling Pirate",
                "Admiral David", "Daiplank", "Red David The Feared", "First Mate Dai The Gentle",
                "Gentle Cristiano", "Norman De Australia", "Dread Pirate Cristiano", "Dave Controllingparrot",
            };
            return fileNames;
        }

        private static ulong GenerateRandomSize()
        {
            var number = Random.Next(1, 100);
            var power = Random.Next(1, 3);

            return (ulong) number * (ulong) Math.Pow(1024, power);
        }

        private static (string extension, string mimeType) GenerateRandomExtensionAndMineType()
        {
            var mineTypes = new[]
            {
                (".7z", "application/x-7z-compressed"), (".zip", "application/zip"), (".xml", "application/xml"),
                (".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
                (".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
                (".ppt", "application/vnd.ms-powerpoint"), (".xls", "application/vnd.ms-excel"),
                (".wav", "audio/wav"), (".ttf", "font/ttf"), (".tar", "application/x-tar"),
                (".svg", "image/svg+xml"), (".rar", "application/vnd.rar"), (".pdf", "application/pdf"),
                (".png", "image/png"), (".odt", "application/vnd.oasis.opendocument.text"),
                (".ods", "application/vnd.oasis.opendocument.spreadsheet"),
                (".odp", "application/vnd.oasis.opendocument.presentation"), (".mpeg", "video/mpeg"),
                (".mp4", "video/mp4"), (".mp3", "audio/mpeg"), (".json", "application/json"),
                (".jpeg", "image/jpeg"), (".jpg", "image/jpeg"), (".gif", "image/gif"),
                (".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
                (".doc", "application/msword"), (".csv", "text/csv"), (".bmp", "image/bmp"),
                (".avi", "video/x-msvideo"), (".txt", "text/plain"), (".iso", "application/octetstream")
            };

            return mineTypes[Random.Next(0, 28)];
        }

        private static bool GenerateRandomBoolean(int likeliness)
        {
            return Random.Next(1, 100) < likeliness;
        }
    }
}