using System;
using System.Threading;
using System.Threading.Tasks;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Options;
using webFileSharingSystem.Web.Contracts.Requests;
using webFileSharingSystem.Web.Contracts.Responses;

namespace webFileSharingSystem.Web.Controllers
{
    public class AuthController : BaseController
    {
        private readonly IUserService _userService;
        private readonly ICurrentUserService _currentUserService;
        private readonly JwtSettings _jwtSettings;

        public AuthController(IUserService userService, IOptions<JwtSettings> jwtSettings, ICurrentUserService currentUserService)
        {
            _userService = userService;
            _currentUserService = currentUserService;
            _jwtSettings = jwtSettings.Value;
        }

        [AllowAnonymous]
        [HttpPost]
        [Route("Login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken = default)
        {
            var (authenticationResult, applicationUser, token, refreshToken) =
                await _userService.AuthenticateAsync(request.Username, request.Password, GetIpAddress(), cancellationToken);

            switch (authenticationResult)
            {
                case AuthenticationResult.Success:
                    var userResponse = new AppUserResponse
                    {
                        Id = applicationUser!.Id,
                        UserName = applicationUser.UserName,
                        EmailAddress = applicationUser.EmailAddress,
                        UsedSpace = applicationUser.UsedSpace,
                        Quota = applicationUser.Quota,
                    };
                    SetRefreshTokenCookie(refreshToken!);
                    return Ok(new {User = userResponse, Tokens = new TokenResponse{Token = token!, RefreshToken = refreshToken!}});
                case AuthenticationResult.NotFound:
                case AuthenticationResult.Failed:
                    return BadRequest(new {Message = "Invalid username or password"});
                case AuthenticationResult.LockedOut:
                    return BadRequest(new {Message = "To many failed login attempts"});
                case AuthenticationResult.IsBlocked:
                    return Unauthorized(new {Message = "User is not allowed to login"});
                default:
                    throw new ArgumentOutOfRangeException();
            }
        }
        
        [AllowAnonymous]
        [HttpPost]
        [Route("LoginWithGoogle")]
        public async Task<IActionResult> LoginWithGoogle([FromBody] string credential, CancellationToken cancellationToken = default)
        {
            GoogleJsonWebSignature.Payload payload = await GoogleJsonWebSignature.ValidateAsync(credential);
            
            var (authenticationResult, applicationUser, token, refreshToken) = 
                await _userService.AuthenticateWithGoogleAsync(payload.Subject, payload.Email, GetIpAddress(), cancellationToken);

            if (authenticationResult == AuthenticationResult.NotFound)
            {
                await _userService.CreateGoogleUserAsync(payload.Email, payload.GivenName, payload.Subject);
                (authenticationResult, applicationUser, token, refreshToken) = 
                    await _userService.AuthenticateWithGoogleAsync(payload.Subject, payload.Email, GetIpAddress(), cancellationToken);
            }

            switch (authenticationResult)
            {
                case AuthenticationResult.Success:
                    var userResponse = new AppUserResponse
                    {
                        Id = applicationUser!.Id,
                        UserName = applicationUser.UserName,
                        EmailAddress = applicationUser.EmailAddress,
                        UsedSpace = applicationUser.UsedSpace,
                        Quota = applicationUser.Quota,
                    };
                    SetRefreshTokenCookie(refreshToken!);
                    return Ok(new {User = userResponse, Tokens = new TokenResponse{Token = token!, RefreshToken = refreshToken!}});
                case AuthenticationResult.NotFound:
                    return BadRequest(new {Message = "Cannot log in with this Google account"});
                case AuthenticationResult.LockedOut:
                    return BadRequest(new {Message = "To many failed login attempts"});
                default:
                    throw new ArgumentOutOfRangeException();
            }
        }
        
        
        [AllowAnonymous]
        [HttpPost]
        [Route("Refresh")]
        public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request, CancellationToken cancellationToken = default)
        {

            var currentRefreshToken = request.RefreshToken ?? Request.Cookies["refreshToken"];

            if (currentRefreshToken is null) return BadRequest(new {Message = "Invalid token"});
            
            var (result, token, refreshToken ) =
                await _userService.RefreshTokenAsync(request.Token, currentRefreshToken , GetIpAddress(), cancellationToken);

            if (!result.Succeeded) return BadRequest(result.Errors);

            var tokenResponse = new TokenResponse { Token = token!, RefreshToken = refreshToken! };
            SetRefreshTokenCookie(refreshToken!);
            return Ok(tokenResponse);
        }
        
        [HttpPut]
        [Route("Revoke")]
        public async Task<IActionResult> RevokeToken([FromQuery] string? refreshToken = null, CancellationToken cancellationToken = default )
        {
            var userId = _currentUserService.UserId;

            var appUser = await _userService.GetUserAsync(userId!.Value, cancellationToken);

            // accept refresh token in request body or cookie
            var token = refreshToken ?? Request.Cookies["refreshToken"];

            if (string.IsNullOrEmpty(token)) return BadRequest(new {Message = "Token is required"});

            var revoked = await _userService.RevokeRefreshTokenAsync(token, appUser.IdentityUserId, GetIpAddress());
            if (!revoked) return BadRequest(new {Message = "Token can't be revoked"});
            
            Response.Cookies.Delete("refreshToken");
            
            return Ok();
        }
        
        [AllowAnonymous]
        [HttpPost]
        [Route("Register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            var (registrationResult, applicationUserId) =
                await _userService.CreateUserAsync(request.Username, request.Email, request.Password);
            
            if (!registrationResult.Succeeded) return BadRequest(registrationResult.Errors);

            return Ok(new {UserId = applicationUserId});
        }
        
        private void SetRefreshTokenCookie(string refreshToken)
        {
            // append cookie with refresh token to the http response
            var cookieOptions = new CookieOptions
            {
                IsEssential = true,
                HttpOnly = true,
                Expires = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryTimeInDays),
                SameSite = SameSiteMode.Strict,
                Secure = true

            };
            Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);
        }
        
        private string GetIpAddress()
        {
            // get source ip address for the current request
            if (Request.Headers.ContainsKey("X-Forwarded-For")) return Request.Headers["X-Forwarded-For"];
            
            return HttpContext.Connection.RemoteIpAddress?.MapToIPv4().ToString() ?? string.Empty;
        }
    }
}