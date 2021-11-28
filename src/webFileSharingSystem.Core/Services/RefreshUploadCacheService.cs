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
                await Task.Delay(30_000, cancellationToken); // Delay 30 seconds
            }
        }

        private async Task DoWorkAsync(CancellationToken cancellationToken = default)
        {
            using (IServiceScope scope = _serviceProvider.CreateScope())
            {
                var unitOfWork =
                    scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
                
                await UploadService.SaveCacheData( unitOfWork, cancellationToken);
            }
        }
    }
}