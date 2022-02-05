using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

using webFileSharingSystem.Core.Interfaces;


namespace webFileSharingSystem.Core.Services
{
    public class RefreshUploadCacheService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        
        public RefreshUploadCacheService(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken cancellationToken)
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                await DoWorkAsync(cancellationToken);
                await Task.Delay(30_0000, cancellationToken); // Delay 5 minutes seconds
            }
        }

        private async Task DoWorkAsync(CancellationToken cancellationToken = default)
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var unitOfWork =
                    scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
                
                var filePersistenceService =
                    scope.ServiceProvider.GetRequiredService<IFilePersistenceService>();
                
                await UploadService.SaveCacheData( unitOfWork, filePersistenceService, cancellationToken);
            }
        }
    }
}