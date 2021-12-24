using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Options;

namespace webFileSharingSystem.Infrastructure.Identity
{
    internal class TokenService
    {
        private readonly JwtSettings _jwtSettings;
        private readonly UserManager<IdentityUser> _userManager;
        private readonly TokenValidationParameters _tokenValidationParameters;

        private static readonly ConcurrentDictionary<string, int> IdentityUserRefreshCount = new();

        public TokenService(IOptions<JwtSettings> jwtSettings, UserManager<IdentityUser> userManager, TokenValidationParameters tokenValidationParameters)
        {
            _jwtSettings = jwtSettings.Value;
            _userManager = userManager;
            _tokenValidationParameters = tokenValidationParameters;
        }
        
        public async Task<(string? token, RefreshToken? refreshToken)> GenerateTokens(ApplicationUser appUser, string ipAddress)
        {
            var identityUser = _userManager.Users.SingleOrDefault(u => u.Id == appUser.IdentityUserId);

            if (identityUser is null)
            {
                throw new Exception($"Identity user not found, IdentityUserId: {appUser.IdentityUserId}");
                //throw new ApplicationUnhandledException( $"Identity user not found, IdentityUserId: {appUser.IdentityUserId}" );
            }

            if (!IncreaseRefreshTokenCount(identityUser.Id)) return (null, null);

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new(JwtRegisteredClaimNames.NameId, appUser.Id.ToString()),
            };

            var roles = await _userManager.GetRolesAsync(identityUser);

            claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

            if (_tokenValidationParameters.ValidAlgorithms.Count() != 1)
            {
                throw new Exception("Invalid JWT configuration");
            }

            var credentials = new SigningCredentials(_tokenValidationParameters.IssuerSigningKey, _tokenValidationParameters.ValidAlgorithms.First());

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddSeconds(_jwtSettings.ExpiryTimeInSeconds),
                SigningCredentials = credentials,
                Audience = _jwtSettings.Audience,
                Issuer = _jwtSettings.Issuer
            };

            var tokenHandler = new JwtSecurityTokenHandler();

            var token = tokenHandler.CreateToken(tokenDescriptor);

            RefreshToken refreshToken;
            using (var rngCryptoServiceProvider = new RNGCryptoServiceProvider())
            {
                var randomBytes = new byte[64];
                rngCryptoServiceProvider.GetBytes(randomBytes);
                refreshToken = new RefreshToken
                {
                    Token = Convert.ToBase64String(randomBytes),
                    ValidUntil = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryTimeInDays),
                    Created = DateTime.UtcNow,
                    CreatedByIp = ipAddress,
                    IdentityUserId = appUser.IdentityUserId,
                    JwtId = token.Id
                };
            }

            return (tokenHandler.WriteToken(token), refreshToken);
        }

        public ClaimsPrincipal? ValidateJwtToken(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var tokenValidateParameters = _tokenValidationParameters.Clone();
            //We want to return ClaimsPrincipal even if the token already expired
            tokenValidateParameters.ValidateLifetime = false;
            try
            {
                return tokenHandler.ValidateToken(token, tokenValidateParameters, out _);
            } catch
            {
                return null;
            }
        }

        private bool IncreaseRefreshTokenCount(string identityUser)
        {
            var maxNumberOfRefreshTokens = _jwtSettings.MaxRefreshTokensPerUserPerDay;
            var currentRefreshTokenCount = IdentityUserRefreshCount.GetValueOrDefault(identityUser);

            if (currentRefreshTokenCount >= maxNumberOfRefreshTokens)
            {
                return false;
            }

            IdentityUserRefreshCount[identityUser] = ++currentRefreshTokenCount;

            return true;
        }
        
        internal static void UpdateRefreshTokensCount(IEnumerable<UserRefreshTokensCount> counts)
        {
            foreach (var userTokensCount in counts)
            {
                IdentityUserRefreshCount[userTokensCount.IdentityUserId] = userTokensCount.Count;
            }
        }
    }
}