using System;
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
using webFileSharingSystem.Infrastructure.Storage;
using File = webFileSharingSystem.Core.Entities.File;

namespace webFileSharingSystem.Web.Controllers
{
    public class DownloadController : BaseController
    {
        private const string GenerateDownloadUrlActionName = "url";
        private const string DownloadSingleFileActionName = "file";
        private const string DownloadMultipleFilesActionName = "archive";
        
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
        [Route(GenerateDownloadUrlActionName)]
        public async Task<ActionResult> GenerateDownloadUrl([FromQuery] int[] fileIds, CancellationToken cancellationToken = default)
        {
            if (fileIds.Length == 0)
                return BadRequest("No file IDs provided");
            
            string downloadUrl;
            if (fileIds.Length > 1)
                downloadUrl = GetDownloadUrl(DownloadMultipleFilesActionName, fileIds);
            else
            {
                var file = await _unitOfWork.Repository<File>().FindByIdAsync(fileIds[0], cancellationToken); 
                if (file is null)
                    return BadRequest("File not found");
                downloadUrl = GetDownloadUrl(file.IsDirectory ? DownloadMultipleFilesActionName : DownloadSingleFileActionName, fileIds);
            }
            
            var bewit = _hawkAuthService.GenerateBewit(Request.Host.Value, downloadUrl, _currentUserService.UserId!.Value);
            var url = QueryHelpers.AddQueryString(downloadUrl, "bewit", bewit);
            
            return Ok(new { Url = url });
        }

        [HttpGet]
        [Route(DownloadSingleFileActionName + "/{fileId:int}")]
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

            var fileStream = await _filePersistenceService.GetFileStream(userId, fileToDownload.FileGuid!.Value, cancellationToken);

            return new FileStreamResult(fileStream, string.IsNullOrEmpty(fileToDownload.MimeType) ? "application/octet-stream" : fileToDownload.MimeType)
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
            Response.Headers.ContentDisposition = $"attachment; filename=\"{archiveName}\"";

            var filesToDownload =
                (await _unitOfWork.CustomQueriesRepository().GetListOfAllFilesFromLocations(fileIds, cancellationToken))
                .ToDictionary(k => k.Id);

            var userId = _currentUserService.UserId!.Value;

            if (fileIds.Except(filesToDownload.Keys).Any()) return BadRequest(ErrorMessage);

            var fileUserIds = filesToDownload.Select(f => f.Value.UserId).Distinct().ToList();

            foreach (var (_, fileToDownload) in filesToDownload.Where(f => fileIds.Contains(f.Key)))
            {
                if (!await _guardService.UserCanPerform(userId, fileToDownload, ShareAccessMode.ReadOnly,
                        cancellationToken))
                    return Unauthorized(ErrorMessage);
            }

            using (var archive = new ZipArchive(Response.BodyWriter.AsStream(), ZipArchiveMode.Create))
            {
                foreach (var file in filesToDownload.Values.Where(f => !f.IsDirectory))
                {
                    var computedFilePath = string.Join("/",
                        file.FindRelativeFilePath(filesToDownload).Reverse()
                            .Select(f => f.FileName));
                    var entry = archive.CreateEntry(computedFilePath, CompressionLevel.NoCompression);
                    await using (var entryStream = entry.Open())
                    {
                        try
                        {
                            var fileStream =
                                await _filePersistenceService.GetFileStream(userId, file.FileGuid!.Value,
                                    cancellationToken);
                            await fileStream.CopyToAsync(entryStream, cancellationToken);
                        }
                        catch (Exception)
                        {
                            return BadRequest("One of the files cannot be retrieved.");
                        }
                    }
                }
            }
            
            return new EmptyResult();
        }
        
        //Single: https://localhost:5001/api/Download/1004
        //Multiple: https://localhost:5001/api/Download/?fileIds=1004

        private string GetDownloadUrl(string actionName, int[] fileIds)
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host.Value}"; //Multiple: baseUrl: https://localhost:5001 Taki sam
            
            var newPath = Request.Path.Value!.Replace(GenerateDownloadUrlActionName, actionName);// .Replace("//", "/"); //multiple: /api/Download/ //signle: /api/Download/1004
            if (actionName is DownloadMultipleFilesActionName)
                newPath = $"{newPath}/{Request.QueryString}"; //QueryHelpers.AddQueryString(newPath, "fileIds", string.Join(",", fileIds.Select(id => id.ToString())));
            else 
                newPath = $"{newPath}/{fileIds.First()}";

            return $"{baseUrl}{newPath}";
        }
    }
}