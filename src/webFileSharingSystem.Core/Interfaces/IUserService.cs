using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface IUserService
    {
        
        Task<ApplicationUser> GetUserAsync(int userId, CancellationToken cancellationToken = default);

        Task<bool> IsInRoleAsync(int userId, string role, CancellationToken cancellationToken = default);

        Task<bool> AuthorizeAsync(int userId, string policyName, CancellationToken cancellationToken = default);

        Task<(Result Result, int UserId)> CreateUserAsync(string userName, string? emailAddress, string password);

        Task<(AuthenticationResult Result, ApplicationUser? AppUser, string? Token, string? RefreshToken)> AuthenticateAsync(string userName, string password, string ipAddress, CancellationToken cancellationToken = default);
        Task<(AuthenticationResult Result, ApplicationUser? AppUser, string? Token, string? RefreshToken)> 
            AuthenticateWithGoogleAsync(string providerKey, string email, string ipAddress, CancellationToken cancellationToken = default);

        Task<(Result Result, string? Token, string? RefreshToken)> RefreshTokenAsync(string token, string refreshToken, string ipAddress, CancellationToken cancellationToken = default);

        Task<bool> RevokeRefreshTokenAsync(string token, string identityUserId, string ipAddress);

        Task<Result> DeleteUserAsync(int userId);
        
        Task<Result> DeleteUserAsync(ApplicationUser appUser);
        // Task<SignInResult> AuthenticateWithGoogle(string providerKey, CancellationToken cancellationToken);
        Task<(Result Result, int UserId)> CreateGoogleUserAsync(string email, string userName,
            string providerKey);
    }
}