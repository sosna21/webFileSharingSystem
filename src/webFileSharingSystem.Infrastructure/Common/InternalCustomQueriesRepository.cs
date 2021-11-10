using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using webFileSharingSystem.Infrastructure.Data;
using webFileSharingSystem.Infrastructure.Identity;

namespace webFileSharingSystem.Infrastructure.Common
{
    internal class InternalCustomQueriesRepository
    {
        private readonly ApplicationDbContext _dbContext;

        public InternalCustomQueriesRepository(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<List<RefreshToken>> GetListOfAllDescendantActiveRefreshTokens(string refreshToken, CancellationToken cancellationToken = default)
        {
            return await _dbContext.GetListOfAllDescendantActiveRefreshTokens(refreshToken).ToListAsync(cancellationToken);
        }
    }
}