using System;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Options;
using webFileSharingSystem.Infrastructure.Common;

namespace webFileSharingSystem.Infrastructure.Identity
{
    public class MaintainRefreshTokensService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        
        public MaintainRefreshTokensService(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken cancellationToken)
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                await DoWorkAsync(cancellationToken);
                await Task.Delay(1500_000, cancellationToken); // Delay 25 minutes
            }
        }

        private async Task DoWorkAsync(CancellationToken cancellationToken = default)
        {
            using (IServiceScope scope = _serviceProvider.CreateScope())
            {
                var unitOfWork =
                    scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
                
                var jwtSettings = scope.ServiceProvider.GetRequiredService<IOptions<JwtSettings>>();

                await RemoveOldRefreshTokens(unitOfWork, jwtSettings, cancellationToken);
                await GetRefreshTokensCount(unitOfWork, cancellationToken);
            }
        }
        
        private async Task RemoveOldRefreshTokens(IUnitOfWork unitOfWork, IOptions<JwtSettings> jwtSettings, CancellationToken cancellationToken = default)
        {
            var tokensToDelete = await unitOfWork.Repository<RefreshToken>().FindAsync(
                new Specification<RefreshToken>(
                    token => (token.Revoked != null || token.ValidUntil < DateTime.UtcNow) &&
                             (token.Revoked ?? token.ValidUntil) < DateTime.UtcNow.AddDays(-jwtSettings.Value.RefreshTokenTimeToLiveInDays)), cancellationToken);
            
            unitOfWork.Repository<RefreshToken>().RemoveRange(tokensToDelete); 
            await unitOfWork.Complete(cancellationToken);
        }

        private async Task GetRefreshTokensCount(IUnitOfWork unitOfWork, CancellationToken cancellationToken = default)
        {
            var refreshTokenCounts = await unitOfWork.Repository<RefreshToken>().FindAsync(new CountDailyRefreshTokensPerUserSpec(), cancellationToken);
            
            TokenService.UpdateRefreshTokensCount( refreshTokenCounts );
        }
    }
}