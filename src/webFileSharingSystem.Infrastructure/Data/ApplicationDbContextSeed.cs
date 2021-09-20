using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Transactions;

using Microsoft.AspNetCore.Identity;

using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Interfaces;

namespace webFileSharingSystem.Infrastructure.Data {
    
    public static class ApplicationDbContextSeed
    {

        private static readonly Random Random = new();
        
        public static async Task SeedDefaultUserAsync( this ApplicationDbContext applicationDbContext,
            UserManager<IdentityUser> userManager,
            RoleManager<IdentityRole> roleManager,
            IRepository<ApplicationUser> applicationUserRepository,
            IRepository<File> fileRepository )
        {
            var administratorRole = new IdentityRole("Administrator");

            if (roleManager.Roles.All(r => r.Name != administratorRole.Name))
            {
                await roleManager.CreateAsync(administratorRole);
            }

            var administrator = new IdentityUser { UserName = "administrator@localhost", Email = "administrator@localhost" };

            if (userManager.Users.All(u => u.UserName != administrator.UserName))
            {
                ApplicationUser applicationUser;
                using (var scope = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
                {
                    await userManager.CreateAsync(administrator, "Administrator1!");
                    await userManager.AddToRolesAsync(administrator, new [] { administratorRole.Name });
                    applicationUser = new ApplicationUser(administrator.UserName, administrator.Email, administrator.Id);
                    applicationUserRepository.Add( applicationUser );
                    await applicationDbContext.SaveChangesAsync();
                    scope.Complete();
                }

                var userId = applicationUser.Id;

                var fileNames = GetRandomFileNames();
                
                
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
                        IsShared = GenerateRandomBoolean(40),
                        IsFavourite = GenerateRandomBoolean(25),
                        IsDeleted = false,
                        UserId = userId
                    };
                    fileRepository.Add(file);
                }
                
                await applicationDbContext.SaveChangesAsync();
            }
        }

        private static IEnumerable<string> GetRandomFileNames()
        {
            var fileNames = new[]
            {
                "marvina_black",
                "Davida vast blond",
                "canada",
                "pretty violent vast",
                "Jo Cornwall",
                "Taura+cream",
                "Alberte arrogant loving",
                "yellow cream",
                "Cornwall ginger",
                "Ireland",
                "Angie brunette",
                "Alberte red",
                "Laurence_green",
                "Zlatica-modest-handsome",
                "Mark Scotland",
                "purple blond red green",
                "Larry Greenbeard",
                "Laurence Boldbrand",
                "Laurence Purplehate",
                "Modest Zlatica",
                "Victorine+scheming",
                "Australia blue",
                "Faustine blonde",
                "Stephen King",
                "lovable yellow",
                "Scheming Victorine Yellow",
                "Considerate Victorine",
                "First Mate Victorine The Considerate",
                "The Lovable Pirate",
                "Dread Pirate Tosia",
                "Stephen Bluebeard",
                "fat Scotlabd",
                "remarkable=patient",
                "Alan Donald",
                "Jude black",
                "Scotland place",
                "Fat Al Blond",
                "Alan Yellowhate",
                "Sir+Jude+Fat",
                "First Mate Donald The Remarkable",
                "Cutthroat Dai The Articulate",
                "The Controlling Pirate",
                "Admiral David",
                "Daiplank",
                "Red David The Feared",
                "First Mate Dai The Gentle",
                "Gentle Cristiano",
                "Norman De Australia",
                "Dread Pirate Cristiano",
                "Dave Controllingparrot",
            };
            return fileNames;
        }

        private static ulong GenerateRandomSize()
        {
           var number = Random.Next(1, 100);
           var power = Random.Next(1, 5);

           return (ulong) number * (ulong) Math.Pow(1024, power);
        }

        private static (string extension, string mimeType) GenerateRandomExtensionAndMineType()
        {
            var mineTypes = new[]
            {
                (".7z", "application/x-7z-compressed"),
                (".zip", "application/zip"),
                (".xml", "application/xml"),
                (".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
                (".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
                (".ppt", "application/vnd.ms-powerpoint"),
                (".xls", "application/vnd.ms-excel"),
                (".wav", "audio/wav"),
                (".ttf", "font/ttf"),
                (".tar", "application/x-tar"),
                (".svg", "image/svg+xml"),
                (".rar", "application/vnd.rar"),
                (".pdf", "application/pdf"),
                (".png", "image/png"),
                (".odt", "application/vnd.oasis.opendocument.text"),
                (".ods", "application/vnd.oasis.opendocument.spreadsheet"),
                (".odp", "application/vnd.oasis.opendocument.presentation"),
                (".mpeg", "video/mpeg"),
                (".mp4", "video/mp4"),
                (".mp3", "audio/mpeg"),
                (".json", "application/json"),
                (".jpeg", "image/jpeg"),
                (".jpg", "image/jpeg"),
                (".gif", "image/gif"),
                (".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
                (".doc", "application/msword"),
                (".csv", "text/csv"),
                (".bmp", "image/bmp"),
                (".avi", "video/x-msvideo"),
                (".txt", "text/plain"),
                (".iso", "application/octetstream")
            };

            return mineTypes[Random.Next(0, 28)];
        }

        private static bool GenerateRandomBoolean(int likeliness)
        {
            return Random.Next(1, 100) < likeliness;
        }
    }
}