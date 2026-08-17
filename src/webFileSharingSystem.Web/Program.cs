using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Testcontainers.MsSql;

using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Infrastructure.Data;

namespace webFileSharingSystem.Web
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            MsSqlContainer? e2eContainer = null;
            if (ShouldUseE2EContainer())
            {
                e2eContainer = new MsSqlBuilder()
                    .WithCleanUp(true)
                    .Build();

                await e2eContainer.StartAsync();

                Environment.SetEnvironmentVariable("ConnectionStrings__DbConnection", e2eContainer.GetConnectionString());
                Environment.SetEnvironmentVariable("DisableDbSeeding", "true");
            }

            var host = CreateHostBuilder(args).Build();
            using var scope = host.Services.CreateScope();
            var services = scope.ServiceProvider;
            try
            {
                var context = services.GetRequiredService<ApplicationDbContext>();

                var config = services.GetRequiredService<IConfiguration>();

                if (!config.GetValue<bool>("UseInMemoryDatabase"))
                {
                    await context.Database.MigrateAsync();
                }

                await EnsureRoleExistsAsync(services, "Member");

                var disableDbSeeding = config.GetValue<bool>("DisableDbSeeding");
                if (!disableDbSeeding)
                {
                    var userManager = services.GetRequiredService<UserManager<IdentityUser>>();
                    var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
                    var applicationUserRepository = services.GetRequiredService<IRepository<ApplicationUser>>();
                    var fileRepository = services.GetRequiredService<IRepository<File>>();
                    var filePersistenceService = services.GetRequiredService<IFilePersistenceService>();

                    var seedData = new ApplicationDbContextSeed(
                        context,
                        userManager,
                        roleManager,
                        applicationUserRepository,
                        fileRepository,
                        filePersistenceService);

                    await seedData.SetTestUserDataAsync();
                }
            }
            catch (Exception ex)
            {
                var logger = services.GetRequiredService<ILogger<Program>>();
                logger.LogError(ex, "An error occurred during migration");
            }

            try
            {
                await host.RunAsync();
            }
            finally
            {
                if (e2eContainer is not null)
                {
                    await e2eContainer.DisposeAsync();
                }
            }
        }

        private static bool ShouldUseE2EContainer()
        {
            var flag = Environment.GetEnvironmentVariable("E2E_USE_TESTCONTAINERS");
            return string.Equals(flag, "true", StringComparison.OrdinalIgnoreCase);
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(
                    webBuilder =>
                    {
                        webBuilder.UseStartup<Startup>();
                    });

        private static async Task EnsureRoleExistsAsync(IServiceProvider services, string roleName)
        {
            var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();

            if (await roleManager.RoleExistsAsync(roleName))
            {
                return;
            }

            for (var attempt = 0; attempt < 3; attempt++)
            {
                try
                {
                    var result = await roleManager.CreateAsync(new IdentityRole(roleName));
                    if (result.Succeeded || await roleManager.RoleExistsAsync(roleName))
                    {
                        return;
                    }
                }
                catch (DbUpdateException)
                {
                    if (await roleManager.RoleExistsAsync(roleName))
                    {
                        return;
                    }
                }

                await Task.Delay(100);
            }

            if (!await roleManager.RoleExistsAsync(roleName))
            {
                throw new InvalidOperationException($"Failed to ensure role exists: {roleName}");
            }
        }
    }
}