using System;
using System.Linq;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;

using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;

namespace webFileSharingSystem.Infrastructure.Identity
{
public class UserService : IUserService
    {
        private readonly UserManager<IdentityUser> _identityUserManager;
        private readonly IUserClaimsPrincipalFactory<IdentityUser> _identityUserClaimsPrincipalFactory;
        private readonly IAuthorizationService _authorizationService;
        private readonly IUnitOfWork _unitOfWork;

        public UserService(
            UserManager<IdentityUser> identityUserManager,
            IUserClaimsPrincipalFactory<IdentityUser> identityUserClaimsPrincipalFactory,
            IAuthorizationService authorizationService,
            IUnitOfWork unitOfWork)
        {
            _identityUserManager = identityUserManager;
            _identityUserClaimsPrincipalFactory = identityUserClaimsPrincipalFactory;
            _authorizationService = authorizationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<string> GetUserNameAsync(int userId)
        {
            var appUser = await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(userId);
            
            if(appUser is null)
            {
                throw new Exception($"User not found, userId: {userId}");
                //throw new UserNotFoundException( userId );
            }
            
            return appUser.UserName;
        }

        public async Task<(Result Result, int UserId)> CreateUserAsync(string userName, string emailAddress, string password)
        {
            var user = new IdentityUser
            {
                UserName = userName,
                Email = emailAddress,
            };

            var identityResult = await _identityUserManager.CreateAsync(user, password);
            
            if(!identityResult.Succeeded)
            {
                return (ToApplicationResult(identityResult), 0);
            }
            
            var appUser = new ApplicationUser(userName, emailAddress, user.Id);
            
            _unitOfWork.Repository<ApplicationUser>().Add(appUser);

            return (ToApplicationResult(identityResult), appUser.Id);
        }

        public async Task<bool> IsInRoleAsync(int userId, string role)
        {
            var appUser = await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(userId);
            
            if(appUser is null)
            {
                throw new Exception($"User not found, userId: {userId}");
                //throw new UserNotFoundException( userId );
            }
            
            var identityUser = _identityUserManager.Users.SingleOrDefault(u => u.Id == appUser.IdentityUserId);
            
            if(identityUser is null)
            {
                throw new Exception($"Identity user not found, IdentityUserId: {appUser.IdentityUserId}");
                //throw new ApplicationUnhandledException( $"Identity user not found, IdentityUserId: {appUser.IdentityUserId}" );
            }
            
            return await _identityUserManager.IsInRoleAsync(identityUser, role);
        }

        public async Task<bool> AuthorizeAsync(int userId, string policyName)
        {
            var appUser = await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(userId);
            
            if(appUser is null)
            {
                throw new Exception($"User not found, userId: {userId}");
                //throw new UserNotFoundException( userId );
            }
            
            var identityUser = _identityUserManager.Users.SingleOrDefault(u => u.Id == appUser.IdentityUserId);
            
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
            
            var identityUser = _identityUserManager.Users.SingleOrDefault(u => u.Id == appUser.IdentityUserId);
            
            if(identityUser is null)
            {
                throw new Exception($"Identity user not found, IdentityUserId: {appUser.IdentityUserId}");
                //throw new ApplicationUnhandledException( $"Identity user not found, IdentityUserId: {appUser.IdentityUserId}" );
            }
            
            var result = await _identityUserManager.DeleteAsync(identityUser);

            return ToApplicationResult(result);
        }
        
        private static Result ToApplicationResult(IdentityResult result)
        {
            return result.Succeeded
                ? Result.Success()
                : Result.Failure(result.Errors.Select(e => e.Description));
        }
    }
}