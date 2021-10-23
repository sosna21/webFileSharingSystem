using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using webFileSharingSystem.Core.Entities;
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
                await Task.Delay(30_000, cancellationToken);
            }
        }

        private async Task DoWorkAsync(CancellationToken cancellationToken = default)
        {
            using (IServiceScope scope = _serviceProvider.CreateScope())
            {
                var applicationDbContext =
                    scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
                var partialFileInfoRepository =
                    scope.ServiceProvider.GetRequiredService<IRepository<PartialFileInfo>>();

                await UploadService.SaveCacheData(partialFileInfoRepository, applicationDbContext,cancellationToken);
            }
        }
    }
}