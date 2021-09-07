using System.Linq;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Identity;

using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Infrastructure.Common;

namespace webFileSharingSystem.Infrastructure.Data {
    
    public static class DataContextSeed {
        
        public static async Task SeedDefaultUserAsync( this ApplicationDbContext applicationDbContext, UserManager<IdentityUser> userManager, RoleManager<IdentityRole> roleManager, Repository<ApplicationUser> applicationUserRepository )
        {
            var administratorRole = new IdentityRole("Administrator");

            if (roleManager.Roles.All(r => r.Name != administratorRole.Name))
            {
                await roleManager.CreateAsync(administratorRole);
            }

            var administrator = new IdentityUser { UserName = "administrator@localhost", Email = "administrator@localhost" };

            if (userManager.Users.All(u => u.UserName != administrator.UserName))
            {
                await userManager.CreateAsync(administrator, "Administrator1!");
                await userManager.AddToRolesAsync(administrator, new [] { administratorRole.Name });
                applicationUserRepository.Add( new ApplicationUser( administrator.UserName, administrator.Email, administrator.Id ) );
                await applicationDbContext.SaveChangesAsync();
            }
        }
    }
}