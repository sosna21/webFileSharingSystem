using System;
using System.Text;

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
using webFileSharingSystem.Infrastructure.Identity;
using webFileSharingSystem.Infrastructure.Storage.OnPremise;

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
                        configuration.GetConnectionString("DefaultConnection"),
                        b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)));
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

            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(
                options =>
                {
                    options.TokenValidationParameters = tokenValidationParameters;
                });
            
            services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
            services.AddScoped<IUnitOfWork, UnitOfWork>();
            services.AddScoped<IFilePersistenceService, FilePersistenceService>();
            services.AddScoped<InternalCustomQueriesRepository>();
            
            services.AddTransient<IUserService, UserService>();
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