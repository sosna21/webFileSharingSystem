using System.Threading;
using System.Threading.Tasks;
using System;
using Microsoft.AspNetCore.Mvc;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Web.Contracts.Requests;
using webFileSharingSystem.Web.Contracts.Responses;


namespace webFileSharingSystem.Web.Controllers;

public class UserController : BaseController
{
    private readonly IUserService _userService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IProfilePhotoService _profilePhotoService;

    public UserController(IUserService userService, ICurrentUserService currentUserService,
        IProfilePhotoService profilePhotoService)
    {
        _userService = userService;
        _currentUserService = currentUserService;
        _profilePhotoService = profilePhotoService;
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

    [HttpGet]
    [Route("Me")]
    public async Task<ActionResult<AppUserResponse>> GetMe(CancellationToken cancellationToken = default)
    {
        var userId = _currentUserService.UserId;
        var applicationUser = await _userService.GetUserAsync(userId!.Value, cancellationToken);

        var response = ToAppUserResponse(applicationUser);
        return Ok(response);
    }

    [HttpPut]
    [Route("Me/Photo")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadMyPhoto(
        [FromForm] UploadPhotoReqest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Photo is null)
        {
            return BadRequest(new[] { "Profile photo is required" });
        }

        var userId = _currentUserService.UserId;

        await using var stream = request.Photo.OpenReadStream();

        var result = await _profilePhotoService.UploadPhotoAsync(
            userId!.Value,
            request.Photo.ContentType,
            request.Photo.Length,
            stream,
            cancellationToken);

        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        return Ok();
    }

    [HttpDelete]
    [Route("Me/Photo")]
    public async Task<IActionResult> DeleteMyPhoto(CancellationToken cancellationToken = default)
    {
        var userId = _currentUserService.UserId;
        var result = await _profilePhotoService.DeletePhotoAsync(userId!.Value, cancellationToken);

        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        return Ok();
    }

    [HttpGet]
    [Route("Photo/{photoId:guid}")]
    public async Task<IActionResult> GetPhotoById(Guid photoId, CancellationToken cancellationToken = default)
    {
        var (result, photo) = await _profilePhotoService.GetPhotoByAccessIdAsync(photoId, cancellationToken);
        if (!result.Succeeded)
        {
            return NotFound(result.Errors);
        }

        return File(photo!.Content, photo.ContentType);
    }

    private AppUserResponse ToAppUserResponse(ApplicationUser user)
    {
        return new AppUserResponse
        {
            Id = user.Id,
            UserName = user.UserName,
            EmailAddress = user.EmailAddress,
            UsedSpace = user.UsedSpace,
            Quota = user.Quota,
            PhotoUrl = user.PhotoAccessId.HasValue
                ? Url.ActionLink(nameof(GetPhotoById), values: new { photoId = user.PhotoAccessId.Value })
                : null,
            PhotoMimeType = user.PhotoMimeType,
            PhotoSize = user.PhotoSize,
            PhotoUpdatedAt = user.PhotoUpdatedAt
        };
    }
}