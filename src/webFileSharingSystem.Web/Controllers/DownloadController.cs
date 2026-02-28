using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Options;

namespace webFileSharingSystem.Web.Controllers
{
    public class DownloadController : BaseController
    {
        private const string GenerateDownloadUrlActionName = "url";
        private const string DownloadSingleFileActionName = "file";
        private const string DownloadMultipleFilesActionName = "archive";
        
        private readonly ICurrentUserService _currentUserService;
        private readonly IHawkAuthService _hawkAuthService;
        private readonly IDownloadService _downloadService;


        public DownloadController(ICurrentUserService currentUserService,
            IHawkAuthService hawkAuthService, IDownloadService downloadService)
        {
            _currentUserService = currentUserService;
            _hawkAuthService = hawkAuthService;
            _downloadService = downloadService;
        }
        
        [HttpPost]
        [Route(GenerateDownloadUrlActionName)]
        public async Task<ActionResult> GenerateDownloadUrl([FromQuery] int[] fileIds,
            CancellationToken cancellationToken = default)
        {
            if (fileIds.Length == 0)
                return BadRequest("No file IDs provided");

            var (result, action, token) = await _downloadService.PrepareDownloadAsync(fileIds, _currentUserService.UserId!.Value, cancellationToken);
            if (!result.Succeeded)
                return result.ToActionResult("Unable to prepare download");

            var actionName = action == DownloadActionType.File ? DownloadSingleFileActionName : DownloadMultipleFilesActionName;

            // Build URL
            var baseUrl = $"{Request.Scheme}://{Request.Host.Value}";
            var url = $"{baseUrl}/api/Download/{actionName}?token={token}";

            // Add bewit
            var bewit = _hawkAuthService.GenerateBewit(Request.Host.Value!, url, _currentUserService.UserId!.Value);
            url = QueryHelpers.AddQueryString(url, "bewit", bewit);

            return Ok(new { Url = url });
        }
        
        [HttpGet]
        [Route(DownloadSingleFileActionName)]
        [Authorize(AuthenticationSchemes = HawkSettings.Scheme)]
        public async Task<ActionResult> DownloadFileAsync([FromQuery] string token, CancellationToken cancellationToken = default)
        {
            var userId = _currentUserService.UserId!.Value;
            var (result, file) = await _downloadService.GetSingleFileAsync(token, userId, cancellationToken);
            if (!result.Succeeded)
                return result.ToActionResult("File does not exist or you do not have access");

            return new FileStreamResult(file!.FileStream, string.IsNullOrEmpty(file.ContentType) ? "application/octet-stream" : file.ContentType)
            {
                FileDownloadName = file.FileName,
                EnableRangeProcessing = true
            };
        }

        [HttpGet]
        [Route(DownloadMultipleFilesActionName)]
        [Authorize(AuthenticationSchemes = HawkSettings.Scheme)]
        public async Task<ActionResult> DownloadMultipleFilesAsync([FromQuery] string token,
            CancellationToken cancellationToken = default)
        {
            const string archiveName = "Archive.zip";
            Response.ContentType = "application/octet-stream";
            Response.Headers.ContentDisposition = $"attachment; filename=\"{archiveName}\"";
            var userId = _currentUserService.UserId!.Value;
            var result = await _downloadService.WriteArchiveToAsync(token, userId, Response.BodyWriter.AsStream(), cancellationToken);
            if (!result.Succeeded)
                return result.ToActionResult("Files or directories does not exist or you do not have access");

            return new EmptyResult();
        }
    }
}