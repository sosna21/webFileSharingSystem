using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
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
        private readonly SymmetricSecurityKey _key;
        private readonly TokenValidationParameters _tokenValidationParameters;

        public TokenService(IOptions<JwtSettings> jwtSettings, UserManager<IdentityUser> userManager, TokenValidationParameters tokenValidationParameters)
        {
            _jwtSettings = jwtSettings.Value;
            _userManager = userManager;
            _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Secret));
            _tokenValidationParameters = tokenValidationParameters;
        }
        public async Task<(string token, RefreshToken refreshToken)> GenerateTokens(ApplicationUser appUser, string ipAddress)
        {
            var identityUser = _userManager.Users.SingleOrDefault(u => u.Id == appUser.IdentityUserId);
            
            if(identityUser is null)
            {
                throw new Exception($"Identity user not found, IdentityUserId: {appUser.IdentityUserId}");
                //throw new ApplicationUnhandledException( $"Identity user not found, IdentityUserId: {appUser.IdentityUserId}" );
            }
            
            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new(JwtRegisteredClaimNames.NameId, appUser.Id.ToString()),
            };

            var roles = await _userManager.GetRolesAsync(identityUser);
            
            claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

            var credentials = new SigningCredentials(_key, SecurityAlgorithms.HmacSha512Signature);

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
    }
}