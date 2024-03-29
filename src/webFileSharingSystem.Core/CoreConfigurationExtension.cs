﻿using Microsoft.Extensions.DependencyInjection;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Services;

namespace webFileSharingSystem.Core
{
    public static class CoreConfigurationExtension
    {
        public static IServiceCollection AddCore(this IServiceCollection services)
        {
            services.AddScoped<IUploadService, UploadService>();
            services.AddScoped<IFileService, FileService>();
            services.AddScoped<IGuardService, GuardService>();
            
            services.AddHostedService(sp => new RefreshUploadCacheService(sp));
            
            return services;
        }
    }
}