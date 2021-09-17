using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Web.Contracts.Requests;
using webFileSharingSystem.Web.Contracts.Responses;

namespace webFileSharingSystem.Web.Controllers
{
    public class AuthController : BaseController
    {

        private readonly IUserService _userService;
        private readonly ITokenService _tokenService;

        public AuthController(IUserService userService, ITokenService tokenService)
        {
            _userService = userService;
            _tokenService = tokenService;
        }
        
        [AllowAnonymous]
        [HttpPost]
        [Route("Login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var (authenticationResult, applicationUser) =
                await _userService.AuthenticateAsync(request.Username, request.Password);

            switch (authenticationResult)
            {
                case AuthenticationResult.Success:
                    var token = _tokenService.GenerateToken(applicationUser!);
                    var userResponse = new AppUserResponse
                    {
                        Id = applicationUser!.Id,
                        UserName = applicationUser.UserName,
                        EmailAddress = applicationUser.EmailAddress,
                        UsedSpace = applicationUser.UsedSpace,
                        Quota = applicationUser.Quota, 
                        Token = await token

                    };
                    return Ok(new { User = userResponse, Message = "Success"  });
                case AuthenticationResult.NotFound:
                case AuthenticationResult.Failed:
                    return BadRequest(new {Message = "Invalid username or password"});
                case AuthenticationResult.LockedOut:
                    return BadRequest(new { Message = "To many failed login attempts" });
                case AuthenticationResult.IsBlocked:
                    return Unauthorized(new { Message = "User is not allowed to login" });
                default:
                    throw new ArgumentOutOfRangeException();
            }
        }
    }
}