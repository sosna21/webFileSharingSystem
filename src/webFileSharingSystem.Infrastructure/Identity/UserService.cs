using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using System.Transactions;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Options;
using webFileSharingSystem.Infrastructure.Common;

namespace webFileSharingSystem.Infrastructure.Identity
{
    
    internal class UserService : IUserService
    {
        private readonly UserManager<IdentityUser> _userManager;
        private readonly SignInManager<IdentityUser> _signInManager;
        private readonly IUserClaimsPrincipalFactory<IdentityUser> _identityUserClaimsPrincipalFactory;
        private readonly IAuthorizationService _authorizationService;

        private readonly TokenService _tokenService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly IOptions<StorageSettings> _options;
        private readonly InternalCustomQueriesRepository _internalCustomQueries;
        
        public UserService(
            UserManager<IdentityUser> userManager,
            SignInManager<IdentityUser> signInManager,
            IUserClaimsPrincipalFactory<IdentityUser> identityUserClaimsPrincipalFactory,
            IAuthorizationService authorizationService,
            IUnitOfWork unitOfWork,
            RoleManager<IdentityRole> roleManager,
            IOptions<StorageSettings> options,
            TokenService tokenService,
            InternalCustomQueriesRepository internalCustomQueries)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _identityUserClaimsPrincipalFactory = identityUserClaimsPrincipalFactory;
            _authorizationService = authorizationService;
            _unitOfWork = unitOfWork;
            _roleManager = roleManager;
            _options = options;
            _tokenService = tokenService;
            _internalCustomQueries = internalCustomQueries;
        }

        public async Task<ApplicationUser> GetUserAsync(int userId, CancellationToken cancellationToken = default)
        {
            var appUser = await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(userId, cancellationToken);
            
            if(appUser is null)
            {
                throw new Exception($"User not found, userId: {userId}");
                //throw new UserNotFoundException( userId );
            }

            return appUser;
        }
        
        public async Task<(Result Result, int UserId)> CreateUserAsync(string userName, string? emailAddress,
            string password)
        {
            return await CreateUserInternal(emailAddress, userName, password);
        }
        
        public async Task<(Result Result, int UserId)> CreateGoogleUserAsync(string email, string userName, string providerKey)
        {
            return await CreateUserInternal(email, userName, providerKey: providerKey);
        }

        private async Task<(Result Result, int UserId)> CreateUserInternal(string? email, string userName, string? password = null, string? providerKey = null)
        {
            if ((password is null && providerKey is null) || (password is not null && providerKey is not null))
                throw new ArgumentException($"Malformed parameters {nameof(password)} or {nameof(providerKey)}");
            
            var identityRole = new IdentityRole("Member");

            if (_roleManager.Roles.All(r => r.Name != identityRole.Name))
            {
                await _roleManager.CreateAsync(identityRole);
            }

            var user = new IdentityUser
            {
                UserName = userName,
                Email = email,
            };

            using (var scope = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
            {
                
                var identityResult = password is not null ? await _userManager.CreateAsync(user, password) 
                    : await _userManager.CreateAsync(user);
                if (!identityResult.Succeeded) return (ToApplicationResult(identityResult), 0);

                identityResult = await _userManager.AddToRolesAsync(user, new[] {identityRole.Name});
                if (!identityResult.Succeeded) return (ToApplicationResult(identityResult), 0);
                
                if(providerKey is not null)
                    await _userManager.AddLoginAsync(user, new UserLoginInfo(
                        GoogleDefaults.AuthenticationScheme, 
                            providerKey, 
                            GoogleDefaults.AuthenticationScheme));

                var applicationUser =
                    new ApplicationUser(user.UserName, user.Email, user.Id, _options.Value.UserDefaultQuota);
                _unitOfWork.Repository<ApplicationUser>().Add(applicationUser);
                if (await _unitOfWork.Complete() <= 0) return (Result.Failure("Problem with creating user"), 0);
                scope.Complete();
                return (Result.Success(), applicationUser.Id);
            }
        }
        

        public async Task<(AuthenticationResult Result, ApplicationUser? AppUser, string? Token, string? RefreshToken)>
            AuthenticateAsync(string userName, string? password, string ipAddress, CancellationToken cancellationToken)
        {
            var identityUser = await _userManager.Users
                .SingleOrDefaultAsync(x => x.UserName == userName || x.Email == userName, cancellationToken);

            if (identityUser is null)
            {
                return (AuthenticationResult.NotFound, null, null, null);
            }

            if (password is not null)
            {
                var result = await _signInManager.CheckPasswordSignInAsync(identityUser, password, true);

                if (result.IsLockedOut)
                {
                    return (AuthenticationResult.LockedOut, null, null, null);
                }
            
                if (result.IsNotAllowed)
                {
                    return (AuthenticationResult.IsBlocked, null, null, null);
                }

                if (!result.Succeeded)
                {
                    return (AuthenticationResult.Failed, null, null, null);
                }
            }
            
            var userByIdentityIdSpecs =
                new Specification<ApplicationUser>(appUser => appUser.IdentityUserId == identityUser!.Id);
            var appUserByIdentityId = await _unitOfWork.Repository<ApplicationUser>().FindAsync( userByIdentityIdSpecs, cancellationToken);

            var appUser = appUserByIdentityId.SingleOrDefault();
        
            if(appUser is null)
            {
                throw new Exception($"User not found, identityUserId: {identityUser!.Id}");
                //throw new UserNotFoundException( userId );
            }
            
            (var token, RefreshToken? refreshToken) = await _tokenService.GenerateTokens(appUser, ipAddress);

            if (refreshToken is null) return (AuthenticationResult.IsBlocked, null, null, null);
            
            _unitOfWork.Repository<RefreshToken>().Add(refreshToken);

            if ( await _unitOfWork.Complete() <= 0) throw new Exception("Problem with refreshing refresh token");

            return (AuthenticationResult.Success, appUser, token, refreshToken.Token);
        }
        

        public async Task<(Result Result, string? Token, string? RefreshToken)> RefreshTokenAsync(string token, string refreshToken, string ipAddress, CancellationToken cancellationToken = default)
        {
            var validateTokenPrincipal = _tokenService.ValidateJwtToken(token);
            if (validateTokenPrincipal is null) return (Result.Failure("Invalid token"), null, null);

            var expiryDate = long.Parse(validateTokenPrincipal.Claims.Single(x => x.Type == JwtRegisteredClaimNames.Exp).Value);

            var expiryDateTimeUtc = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddSeconds(expiryDate);

            if (expiryDateTimeUtc > DateTime.UtcNow) return (Result.Failure("Token hasn't expired yet"), null, null);
            
            var storedRefreshToken = (await _unitOfWork.Repository<RefreshToken>().FindAsync(new Specification<RefreshToken>(x => x.Token == refreshToken), cancellationToken)).SingleOrDefault();

            if (storedRefreshToken is null) return (Result.Failure("Invalid token"), null, null);

            if (storedRefreshToken.Revoked is not null)
            {
                var refreshTokensToRevoke = await _internalCustomQueries.GetListOfAllDescendantActiveRefreshTokens(refreshToken, cancellationToken);

                foreach (var refreshTokenToRevoke in refreshTokensToRevoke)
                {
                    RevokeRefreshToken(refreshTokenToRevoke, ipAddress);
                }
                
                if ( await _unitOfWork.Complete() <= 0) throw new Exception("Problem with refreshing tokens");
            }
            
            if(storedRefreshToken.Revoked is not null || storedRefreshToken.ValidUntil < DateTime.UtcNow) return (Result.Failure("Invalid token"), null, null);
            
            var jwtId = validateTokenPrincipal.Claims.Single(x => x.Type == JwtRegisteredClaimNames.Jti).Value;
            
            if(storedRefreshToken.JwtId != jwtId) return (Result.Failure("Invalid token"), null, null);

            if (!int.TryParse(validateTokenPrincipal.Claims.SingleOrDefault(x => x.Type == ClaimTypes.NameIdentifier)?.Value, out var userId))
                return (Result.Failure("Invalid token"), null, null);


            var appUser = await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(userId, cancellationToken);
            
            
            (var newToken, RefreshToken? newRefreshToken) = await _tokenService.GenerateTokens(appUser, ipAddress);

            if (newRefreshToken is null) return (Result.Failure("User is blocked"), null, null);
            
            _unitOfWork.Repository<RefreshToken>().Add(newRefreshToken);

            storedRefreshToken.ReplacedByToken = newRefreshToken.Token;
            RevokeRefreshToken(storedRefreshToken, ipAddress);
            
            if ( await _unitOfWork.Complete() <= 0) throw new Exception("Problem with refreshing tokens");
            
            return (Result.Success(), newToken, newRefreshToken.Token);
        }

        public async Task<bool> IsInRoleAsync(int userId, string role, CancellationToken cancellationToken = default)
        {
            var appUser = await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(userId, cancellationToken);
            
            if(appUser is null)
            {
                throw new Exception($"User not found, userId: {userId}");
                //throw new UserNotFoundException( userId );
            }
            
            var identityUser = _userManager.Users.SingleOrDefault(u => u.Id == appUser.IdentityUserId);
            
            if(identityUser is null)
            {
                throw new Exception($"Identity user not found, IdentityUserId: {appUser.IdentityUserId}");
                //throw new ApplicationUnhandledException( $"Identity user not found, IdentityUserId: {appUser.IdentityUserId}" );
            }
            
            return await _userManager.IsInRoleAsync(identityUser, role);
        }

        public async Task<bool> AuthorizeAsync(int userId, string policyName, CancellationToken cancellationToken = default)
        {
            var appUser = await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(userId, cancellationToken);

            if(appUser is null)
            {
                throw new Exception($"User not found, userId: {userId}");
                //throw new UserNotFoundException( userId );
            }
            
            var identityUser = _userManager.Users.SingleOrDefault(u => u.Id == appUser.IdentityUserId);
            
            if(identityUser is null)
            {
                throw new Exception($"Identity user not found, IdentityUserId: {appUser.IdentityUserId}");
                //throw new ApplicationUnhandledException( $"Identity user not found, IdentityUserId: {appUser.IdentityUserId}" );
            }

            var principal = await _identityUserClaimsPrincipalFactory.CreateAsync(identityUser);

            var result = await _authorizationService.AuthorizeAsync(principal, policyName);

            return result.Succeeded;
        }

        public async Task<Result> DeleteUserAsync(int userId)
        {
            var appUser = await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(userId);
            
            if(appUser is null)
            {
                throw new Exception($"User not found, userId: {userId}");
                //throw new UserNotFoundException( userId );
            }
            
            return await DeleteUserAsync(appUser);
        }

        public async Task<Result> DeleteUserAsync(ApplicationUser appUser)
        {
            
            var identityUser = _userManager.Users.SingleOrDefault(u => u.Id == appUser.IdentityUserId);
            
            if(identityUser is null)
            {
                throw new Exception($"Identity user not found, IdentityUserId: {appUser.IdentityUserId}");
                //throw new ApplicationUnhandledException( $"Identity user not found, IdentityUserId: {appUser.IdentityUserId}" );
            }
            
            var result = await _userManager.DeleteAsync(identityUser);

            return ToApplicationResult(result);
        }
        

        public async Task<bool> RevokeRefreshTokenAsync(string token, string identityUserId, string ipAddress)
        {
            var refreshToken = (await _unitOfWork.Repository<RefreshToken>()
                .FindAsync(new Specification<RefreshToken>(x => x.Token == token && x.Revoked == null))).SingleOrDefault();

            if (refreshToken is null) return false;

            if (refreshToken.IdentityUserId != identityUserId) return false;
            
            RevokeRefreshToken(refreshToken, ipAddress);
            
            if ( await _unitOfWork.Complete() <= 0) throw new Exception("Problem with revoking refresh token");
            
            return true;
        }

        private void RevokeRefreshToken(RefreshToken refreshToken, string ipAddress)
        {
            refreshToken.RevokedByIp = ipAddress;
            refreshToken.Revoked = DateTime.UtcNow;
            _unitOfWork.Repository<RefreshToken>().Update(refreshToken);
        }
        
        private static Result ToApplicationResult(IdentityResult result)
        {
            return result.Succeeded
                ? Result.Success()
                : Result.Failure(result.Errors.Select(e => e.Description));
        }
    }
}