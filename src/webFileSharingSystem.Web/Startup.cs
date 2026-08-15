using System;
using System.IO;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi;
using webFileSharingSystem.Core;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Options;
using webFileSharingSystem.Infrastructure;
using webFileSharingSystem.Web.Services;

namespace webFileSharingSystem.Web
{
    public class Startup
    {
        private readonly IConfiguration _config;

        public Startup(IConfiguration configuration)
        {
            _config = configuration;
        }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddCore();

            services.AddInfrastructure(_config);

            services.Configure<GoogleAuthSetting>(_config.GetSection(nameof(GoogleAuthSetting)));
            services.Configure<DownloadTokenOptions>(_config.GetSection("DownloadToken"));

            services.AddSingleton<ICurrentUserService, CurrentUserService>();

            services.AddControllers();
            services.AddHealthChecks();
            services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend",
                    builder => builder
                        .WithOrigins("https://localhost:4200")
                        .AllowCredentials() // Required when using cookies
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                );
            });
            
            services.AddSwaggerGen(option =>
            {
                option.SwaggerDoc("v1", new OpenApiInfo { Title = "webFileSharingSystem.Api", Version = "v1" });
                option.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Description = "JWT Bearer authentication."
                });
                option.AddSecurityRequirement(document => new OpenApiSecurityRequirement
                {
                    [new OpenApiSecuritySchemeReference("Bearer", document)] = []
                });
            });
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseSwagger();
                app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "webFileSharingSystem.Api v1"));
            }

            if (!_config.GetValue<bool>("DisableHttpsRedirection"))
            {
                app.UseHttpsRedirection();
            }

            app.UseStaticFiles();

            app.UseRouting();

            app.UseCors("AllowFrontend");
            app.UseAuthentication();

            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
                endpoints.MapHealthChecks("/health");

                endpoints.MapFallback(async context =>
                {
                    var path = context.Request.Path;

                    var isPolish =
                        path.Equals("/pl", StringComparison.OrdinalIgnoreCase) ||
                        path.StartsWithSegments("/pl");

                    var indexFile = isPolish
                        ? "pl/index.html"
                        : "index.html";

                    var filePath = Path.Combine(env.WebRootPath, indexFile);

                    context.Response.ContentType = "text/html";
                    await context.Response.SendFileAsync(filePath);
                });
            });
        }
    }
}