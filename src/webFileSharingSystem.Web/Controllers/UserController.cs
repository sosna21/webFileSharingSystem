using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using webFileSharingSystem.Core.Interfaces;


namespace webFileSharingSystem.Web.Controllers;

public class UserController : BaseController
{
    private readonly IUserService _userService;
    private readonly ICurrentUserService _currentUserService;

    public UserController(IUserService userService, ICurrentUserService currentUserService)
    {
        _userService = userService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    [Route("Me/Quota")]
    public async Task<IActionResult> Login(CancellationToken cancellationToken = default)
    {
        var userId = _currentUserService.UserId;
        var applicationUser = await _userService.GetUserAsync(userId!.Value, cancellationToken);

        var quotaResponse = new
        {
            applicationUser.UsedSpace,
            applicationUser.Quota,
        };

        return Ok(quotaResponse);
    }
}