using System;
using System.Collections.Generic;
using System.IO;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using webFileSharingSystem.Infrastructure.Data;
using webFileSharingSystem.Web;

namespace webFileSharingSystem.IntegrationTests.Helpers
{
    public sealed class IntegrationTestWebApplicationFactory : WebApplicationFactory<Program>
    {
        private readonly SqlServerContainerFixture _dbFixture;
        private readonly string _storageRoot;

        public IntegrationTestWebApplicationFactory(SqlServerContainerFixture dbFixture)
        {
            _dbFixture = dbFixture;
            _storageRoot = Path.Combine(Path.GetTempPath(), "webfilesharingsystem-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(_storageRoot);
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");

            builder.ConfigureAppConfiguration((_, config) =>
            {
                var settings = new Dictionary<string, string?>
                {
                    ["UseInMemoryDatabase"] = "false",
                    ["UseAzureBlobStorage"] = "false",
                    ["DisableDbSeeding"] = "true",
                    ["DisableHttpsRedirection"] = "true",
                    ["ConnectionStrings:DbConnection"] = _dbFixture.ConnectionString,
                    ["JwtSettings:Secret"] = "test-secret-test-secret-test-secret-test-secret-test-secret-test-secret",
                    ["JwtSettings:Issuer"] = "https://localhost",
                    ["JwtSettings:Audience"] = "https://localhost",
                    ["HawkSettings:Secret"] = "test-hawk-secret",
                    ["StorageSettings:UserDefaultQuota"] = "5368709120",
                    ["StorageSettings:OnPremiseFileLocation"] = _storageRoot,
                    ["StorageSettings:ProfilePhotoSubdirectory"] = "photos",
                    ["StorageSettings:ProfilePhotoMaxSizeBytes"] = "5242880"
                };

                config.AddInMemoryCollection(settings);
            });

            builder.ConfigureServices(services =>
            {
                var serviceProvider = services.BuildServiceProvider();
                using var scope = serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                dbContext.Database.Migrate();
            });
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);

            if (disposing && Directory.Exists(_storageRoot))
            {
                Directory.Delete(_storageRoot, true);
            }
        }
    }
}
