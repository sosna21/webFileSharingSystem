using System.IO.Compression;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Options;
using File = webFileSharingSystem.Core.Entities.File;
using SystemIOFile = System.IO.File;

namespace webFileSharingSystem.Web.Controllers
{
    public class DownloadController : BaseController
    {
        private const string DownloadSingleFileActionName = "";
        private const string DownloadMultipleFilesActionName = "Multiple";
        private const string GenerateDownloadUrlActionName = "GenerateUrl";
        
        private readonly IUnitOfWork _unitOfWork;

        private readonly ICurrentUserService _currentUserService;

        private readonly IFilePersistenceService _filePersistenceService;
        private readonly IHawkAuthService _hawkAuthService;
        private readonly IGuardService _guardService;


        public DownloadController(IUnitOfWork unitOfWork, ICurrentUserService currentUserService,
            IFilePersistenceService filePersistenceService, IHawkAuthService hawkAuthService, IGuardService guardService)
        {
            _unitOfWork = unitOfWork;
            _currentUserService = currentUserService;
            _filePersistenceService = filePersistenceService;
            _hawkAuthService = hawkAuthService;
            _guardService = guardService;
        }
        
        [HttpPost]
        [Route(GenerateDownloadUrlActionName + "/{fileId:int}")]
        public async Task<ActionResult> GenerateDownloadUrl(int fileId, CancellationToken cancellationToken = default)
        {
            var downloadUrl = GetDownloadUrl(GenerateDownloadUrlActionName, DownloadSingleFileActionName);
            
            var bewit = _hawkAuthService.GenerateBewit(Request.Host.Value, downloadUrl, _currentUserService.UserId!.Value);

            return Ok(new { Url = QueryHelpers.AddQueryString(downloadUrl, "bewit", bewit)});
        }
        
        [HttpPost]
        [Route(GenerateDownloadUrlActionName)]
        public async Task<ActionResult> GenerateDownloadUrlMultipleFiles([FromQuery] int[] fileIds, CancellationToken cancellationToken = default)
        {
            var downloadUrl = GetDownloadUrl(GenerateDownloadUrlActionName, DownloadMultipleFilesActionName);
            
            var bewit = _hawkAuthService.GenerateBewit(Request.Host.Value, downloadUrl, _currentUserService.UserId!.Value);

            return Ok(new { Url = QueryHelpers.AddQueryString(downloadUrl, "bewit", bewit)});
        }

        [HttpGet]
        [Route(DownloadSingleFileActionName + "{fileId:int}")]
        [Authorize(AuthenticationSchemes = HawkSettings.Scheme)]
        public async Task<ActionResult> DownloadFileAsync(int fileId, CancellationToken cancellationToken = default)
        {
            const string ErrorMessage = "File does not exist or you do not have access";

            var userId = _currentUserService.UserId!.Value;
            var fileToDownload = await _unitOfWork.Repository<File>().FindByIdAsync(fileId, cancellationToken);
            if (fileToDownload is null) return BadRequest(ErrorMessage);
            
            if (!await _guardService.UserCanPerform(userId, fileToDownload, ShareAccessMode.ReadOnly, cancellationToken))
                return Unauthorized(ErrorMessage);

            if (fileToDownload.IsDirectory) return BadRequest("Directory can't be downloaded");

            var filePath = _filePersistenceService.GetFilePath(fileToDownload.UserId, fileToDownload.FileId!.Value);

            return new FileStreamResult(_filePersistenceService.GetFileStream(filePath), fileToDownload.MimeType)
            {
                FileDownloadName = fileToDownload.FileName,
                EnableRangeProcessing = true
            };
        }
        
        [HttpGet]
        [Route(DownloadMultipleFilesActionName)]
        [Authorize(AuthenticationSchemes = HawkSettings.Scheme)]
        public async Task<ActionResult> DownloadMultipleFilesAsync([FromQuery] int[] fileIds,
            CancellationToken cancellationToken = default)
        {
            const string archiveName = "Archive.zip";
            const string ErrorMessage = "Files or directories does not exist or you do not have access";
            
            Response.ContentType = "application/octet-stream";
            Response.Headers.Add("Content-Disposition", $"attachment; filename=\"{archiveName}\"");

            var filesToDownload =
                (await _unitOfWork.CustomQueriesRepository().GetListOfAllFilesFromLocations(fileIds, cancellationToken))
                .ToDictionary(k => k.Id);
            
            var userId = _currentUserService.UserId!.Value;

            if (fileIds.Except(filesToDownload.Keys).Any()) return BadRequest(ErrorMessage);

            var fileUserIds = filesToDownload.Select(f => f.Value.UserId).Distinct().ToList();

            foreach (var (_, fileToDownload) in filesToDownload.Where(f => fileIds.Contains(f.Key)))
            {
                if (!await _guardService.UserCanPerform(userId, fileToDownload, ShareAccessMode.ReadOnly, cancellationToken))
                    return Unauthorized(ErrorMessage);
            }
            
            using (var archive = new ZipArchive(Response.BodyWriter.AsStream(), ZipArchiveMode.Create))
            {
                foreach (var file in filesToDownload.Values.Where(f => !f.IsDirectory))
                {
                    var computedFilePath = string.Join("/",
                        _filePersistenceService.FindRelativeFilePath(file, filesToDownload).Reverse()
                            .Select(f => f.FileName));
                    var storedFilePath = _filePersistenceService.GetFilePath(file.UserId, file.FileId!.Value);
                    var entry = archive.CreateEntry(computedFilePath);
                    await using (var entryStream = entry.Open())
                    {
                        await using (var fileStream = SystemIOFile.OpenRead(storedFilePath))
                        {
                            await fileStream.CopyToAsync(entryStream, cancellationToken);
                        }
                    }
                }
            }

            return Ok();
        }

        private string GetDownloadUrl(string oldAction, string newAction)
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host.Value}";

            var newPath = Request.Path.Value!.Replace(oldAction, newAction).Replace("//", "/");

            return $"{baseUrl}{newPath}{Request.QueryString}";
        }
    }
}