﻿using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Transactions;
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
public class UserService : IUserService
    {
        private readonly UserManager<IdentityUser> _userManager;
        private readonly SignInManager<IdentityUser> _signInManager;
        private readonly IUserClaimsPrincipalFactory<IdentityUser> _identityUserClaimsPrincipalFactory;
        private readonly IAuthorizationService _authorizationService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly IOptions<StorageSettings> _options;

        public UserService(
            UserManager<IdentityUser> userManager,
            SignInManager<IdentityUser> signInManager,
            IUserClaimsPrincipalFactory<IdentityUser> identityUserClaimsPrincipalFactory,
            IAuthorizationService authorizationService,
            IUnitOfWork unitOfWork,
            RoleManager<IdentityRole> roleManager,
            IOptions<StorageSettings> options)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _identityUserClaimsPrincipalFactory = identityUserClaimsPrincipalFactory;
            _authorizationService = authorizationService;
            _unitOfWork = unitOfWork;
            _roleManager = roleManager;
            _options = options;
        }

        public async Task<string> GetUserNameAsync(int userId, CancellationToken cancellationToken = default)
        {
            var appUser = await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(userId, cancellationToken);
            
            if(appUser is null)
            {
                throw new Exception($"User not found, userId: {userId}");
                //throw new UserNotFoundException( userId );
            }
            
            return (appUser.UserName ?? appUser.EmailAddress)!;
        }



        public async Task<(Result Result, int UserId)> CreateUserAsync(string userName, string? emailAddress,
            string password)
        {
            var identityRole = new IdentityRole("Member");

            if (_roleManager.Roles.All(r => r.Name != identityRole.Name))
            {
                await _roleManager.CreateAsync(identityRole);
            }

            var user = new IdentityUser
            {
                UserName = userName,
                Email = emailAddress,
            };
            
            using (var scope = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
            {
                var identityResult = await _userManager.CreateAsync(user, password);
                if(!identityResult.Succeeded) return (ToApplicationResult(identityResult), 0);
                
                identityResult = await _userManager.AddToRolesAsync(user, new[] {identityRole.Name});
                if(!identityResult.Succeeded) return (ToApplicationResult(identityResult), 0);
                
                var applicationUser = new ApplicationUser(user.UserName, user.Email, user.Id, _options.Value.UserDefaultQuota);
                _unitOfWork.Repository<ApplicationUser>().Add(applicationUser);
                if (await _unitOfWork.Complete() <= 0) return (Result.Failure("Problem with creating user"),0);
                scope.Complete();
                return (Result.Success(), applicationUser.Id);
            } 
        }
        

        public async Task<(AuthenticationResult Result, ApplicationUser? AppUser)> AuthenticateAsync(string userName, string password, CancellationToken cancellationToken = default)
        {
            var identityUser = await _userManager.Users
                .SingleOrDefaultAsync(x => x.UserName == userName || x.Email == userName, cancellationToken);

            if (identityUser is null)
            {
                return (AuthenticationResult.NotFound, null);
            }

            var result = await _signInManager.CheckPasswordSignInAsync(identityUser, password, true);

            if (result.IsLockedOut)
            {
                return (AuthenticationResult.LockedOut, null);
            }
            
            if (result.IsNotAllowed)
            {
                return (AuthenticationResult.IsBlocked, null);
            }

            if (!result.Succeeded)
            {
                return (AuthenticationResult.Failed, null);
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
            

            return (AuthenticationResult.Success, appUser);
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
        
        private static Result ToApplicationResult(IdentityResult result)
        {
            return result.Succeeded
                ? Result.Success()
                : Result.Failure(result.Errors.Select(e => e.Description));
        }
    }
}