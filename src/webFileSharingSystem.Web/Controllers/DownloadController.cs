using System.IO.Compression;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using webFileSharingSystem.Core.Interfaces;
using File = webFileSharingSystem.Core.Entities.File;
using SystemIOFile = System.IO.File;

namespace webFileSharingSystem.Web.Controllers
{
    public class DownloadController : BaseController
    {
        private readonly IUnitOfWork _unitOfWork;

        private readonly ICurrentUserService _currentUserService;

        private readonly IFilePersistenceService _filePersistenceService;


        public DownloadController(IUnitOfWork unitOfWork, ICurrentUserService currentUserService,
            IFilePersistenceService filePersistenceService)
        {
            _unitOfWork = unitOfWork;
            _currentUserService = currentUserService;
            _filePersistenceService = filePersistenceService;
        }

        [HttpGet]
        [Route("{fileId:int}")]
        public async Task<ActionResult> DownloadFileAsync(int fileId, CancellationToken cancellationToken = default)
        {
            const string ErrorMessage = "File does not exist or you do not have access";

            var userId = _currentUserService.UserId;
            var fileToDownload = await _unitOfWork.Repository<File>().FindByIdAsync(fileId, cancellationToken);
            if (fileToDownload is null) return BadRequest(ErrorMessage);
            if (fileToDownload.UserId != userId) return Unauthorized(ErrorMessage);

            if (fileToDownload.IsDirectory) return BadRequest("Directory can't be downloaded");

            var filePath = _filePersistenceService.GetFilePath(userId.Value, fileToDownload.FileId!.Value);

            return new FileStreamResult(_filePersistenceService.GetFileStream(filePath), fileToDownload.MimeType)
            {
                FileDownloadName = fileToDownload.FileName,
                EnableRangeProcessing = true
            };
        }

        [AllowAnonymous]
        [HttpGet]
        [Route("{fileId:int}/Anonymous")]
        public async Task<IActionResult> DownloadFileUnauthenticatedAsync(int fileId,
            CancellationToken cancellationToken = default)
        {
            const string ErrorMessage = "File does not exist or you do not have access";

            var fileToDownload = await _unitOfWork.Repository<File>().FindByIdAsync(fileId, cancellationToken);
            if (fileToDownload is null) return BadRequest(ErrorMessage);

            if (fileToDownload.IsDirectory) return BadRequest("Directory can't be downloaded");

            var filePath = _filePersistenceService.GetFilePath(fileToDownload.UserId, fileToDownload.FileId!.Value);

            return new FileStreamResult(_filePersistenceService.GetFileStream(filePath),
                string.IsNullOrEmpty(fileToDownload.MimeType) ? "application/octet-stream" : fileToDownload.MimeType)
            {
                FileDownloadName = fileToDownload.FileName,
                EnableRangeProcessing = true
            };
        }

        [AllowAnonymous]
        [HttpGet]
        [Route("Multiple")]
        public async Task DownloadMultipleFilesUnauthenticatedAsync([FromQuery] int[] fileIds,
            CancellationToken cancellationToken = default)
        {
            const string archiveName = "Archive.zip";
            Response.ContentType = "application/octet-stream";
            Response.Headers.Add("Content-Disposition", $"attachment; filename=\"{archiveName}\"");

            var filesToDownload =
                (await _unitOfWork.CustomQueriesRepository().GetListOfAllFilesFromLocations(fileIds, cancellationToken))
                .ToDictionary(k => k.Id);
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
        }
    }
}