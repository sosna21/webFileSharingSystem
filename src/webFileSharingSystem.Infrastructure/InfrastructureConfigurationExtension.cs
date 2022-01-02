using System;
using System.Text;
using System.Threading.Tasks;
using Azure.Storage.Blobs;
using HawkNet;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Options;
using webFileSharingSystem.Infrastructure.Common;
using webFileSharingSystem.Infrastructure.Data;
using webFileSharingSystem.Infrastructure.HawkAuth;
using webFileSharingSystem.Infrastructure.Identity;
using webFileSharingSystem.Infrastructure.Storage;

namespace webFileSharingSystem.Infrastructure
{
    public static class InfrastructureConfigurationExtension
    {
        public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
        {
            
            if (configuration.GetValue<bool>("UseInMemoryDatabase"))
            {
                services.AddDbContext<ApplicationDbContext>(
                    options => options.UseInMemoryDatabase("webFileSharingSystem"));
            }
            else
            {
                services.AddDbContext<ApplicationDbContext>(options =>
                    options.UseSqlServer(
                        configuration.GetConnectionString("DbConnection"),
                        b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)));
            }

            if (configuration.GetValue<bool>("UzeAzureBlobStorage"))
            {
                services.AddSingleton(x => new BlobServiceClient(configuration.GetConnectionString("AzureBlobStorageConnection")));
                services.AddScoped<IFilePersistenceService, AzureFilePersistenceService>();
            }
            else
            {
                services.AddScoped<IFilePersistenceService, LocalFilePersistenceService>();
            }

            services.AddScoped<IApplicationDbContext>(provider => provider.GetService<ApplicationDbContext>()!);

            //services.AddScoped<IDomainEventService, DomainEventService>();
            
            services.AddIdentityCore<IdentityUser>()
                .AddRoles<IdentityRole>()
                .AddRoleManager<RoleManager<IdentityRole>>()
                .AddSignInManager<SignInManager<IdentityUser>>()
                .AddRoleValidator<RoleValidator<IdentityRole>>()
                .AddEntityFrameworkStores<ApplicationDbContext>();
            
            var jwtSection = configuration.GetSection(nameof(JwtSettings));
            services.Configure<JwtSettings>(jwtSection);

            // configure jwt authentication
            var jwtSettings = jwtSection.Get<JwtSettings>();
            
            var storageSection = configuration.GetSection(nameof(StorageSettings));
            services.Configure<StorageSettings>(storageSection);
            
            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
                ValidAlgorithms = new []{ SecurityAlgorithms.HmacSha512 },
                ValidIssuer = jwtSettings.Issuer,
                ValidAudience = jwtSettings.Audience,
                ClockSkew = TimeSpan.Zero,
                ValidateLifetime = true
            };

            services.AddSingleton(tokenValidationParameters);

            var hawkSection = configuration.GetSection(nameof(HawkSettings));
            services.Configure<HawkSettings>(hawkSection);

            // configure hawk authentication
            var hawkSettings = hawkSection.Get<HawkSettings>();

            var hawkCredential = new HawkCredential
            {
                Key = hawkSettings.Secret,
                Algorithm = SecurityAlgorithms.Sha256
            };

            services.AddSingleton(hawkCredential);
            
            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(
                    options => options.TokenValidationParameters = tokenValidationParameters)
                .AddScheme<HawkAuthSchemeOptions, HawkAuthHandler>(HawkSettings.Scheme, options =>
                    options.Credentials = _ => Task.FromResult(hawkCredential));

            services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
            services.AddScoped<IUnitOfWork, UnitOfWork>();
            services.AddScoped<InternalCustomQueriesRepository>();
            
            services.AddTransient<IUserService, UserService>();
            services.AddTransient<IHawkAuthService, HawkAuthService>();
            services.AddTransient<TokenService>();
            
            services.AddHostedService(sp => new MaintainRefreshTokensService(sp));


            services.AddAuthorization(options =>
            {
                options.AddPolicy("AdminOnly", policy => policy.RequireRole("Administrator"));
            });
            

            return services;
        }
    }
}