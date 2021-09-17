using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Options;

namespace webFileSharingSystem.Infrastructure.Identity
{
    public class TokenService: ITokenService
    {
        private readonly JwtSettings _settings;
        private readonly UserManager<IdentityUser> _userManager;
        private readonly SymmetricSecurityKey _key;
        
        public TokenService(IOptions<JwtSettings> settings, UserManager<IdentityUser> userManager)
        {
            _settings = settings.Value;
            _userManager = userManager;
            _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
        }
        public async Task<string> GenerateToken(ApplicationUser appUser)
        {
            var identityUser = _userManager.Users.SingleOrDefault(u => u.Id == appUser.IdentityUserId);
            
            if(identityUser is null)
            {
                throw new Exception($"Identity user not found, IdentityUserId: {appUser.IdentityUserId}");
                //throw new ApplicationUnhandledException( $"Identity user not found, IdentityUserId: {appUser.IdentityUserId}" );
            }
            
            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.NameId, appUser.Id.ToString()),
            };

            var roles = await _userManager.GetRolesAsync(identityUser);
            
            claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

            var credentials = new SigningCredentials(_key, SecurityAlgorithms.HmacSha512Signature);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddSeconds(_settings.ExpiryTimeInSeconds),
                SigningCredentials = credentials,
                Audience = _settings.Audience,
                Issuer = _settings.Issuer
            };

            var tokenHandler = new JwtSecurityTokenHandler();

            var token = tokenHandler.CreateToken(tokenDescriptor);
            
            return tokenHandler.WriteToken(token);
        }
    }
}