using System;
using System.Linq;
using webFileSharingSystem.Core.Specifications;

namespace webFileSharingSystem.Infrastructure.Identity
{
    internal sealed class CountTodayRefreshTokensPerUserSpec : BaseSpecification<RefreshToken, UserRefreshTokensCount>
    {
        public CountTodayRefreshTokensPerUserSpec() : base(token =>
            token.Created > DateTime.UtcNow.Date)
        {
            ApplyGroupBy( g => g.IdentityUserId, (userId , tokens) => new UserRefreshTokensCount{ IdentityUserId = (string)userId, Count = tokens.Count()}  );
        }
    }
}