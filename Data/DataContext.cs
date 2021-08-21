using API.Entities;
using API.Identity;

using IdentityServer4.EntityFramework.Options;

using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.ApiAuthorization.IdentityServer;
using Microsoft.Extensions.Options;

namespace API.Data
{
    public class DataContext : ApiAuthorizationDbContext<ApplicationUser>
    {
        public DataContext(DbContextOptions options, IOptions<OperationalStoreOptions> operationalStoreOptions)
            : base(options, operationalStoreOptions )
        {
        }
        
        public DbSet<AppUser> UsersNoIdentity { get; set; }
    }
}