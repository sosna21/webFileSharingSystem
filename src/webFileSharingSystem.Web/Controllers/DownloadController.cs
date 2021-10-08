using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

using webFileSharingSystem.Core.Interfaces;

using File = webFileSharingSystem.Core.Entities.File;

namespace webFileSharingSystem.Web.Controllers
{
    public class DownloadController : BaseController
    {
        private readonly IUnitOfWork _unitOfWork;

        private readonly ICurrentUserService _currentUserService;

        private readonly IFilePersistenceService _filePersistenceService;

        public DownloadController(IUnitOfWork unitOfWork, ICurrentUserService currentUserService, IFilePersistenceService filePersistenceService)
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
        public async Task<IActionResult> DownloadFileUnauthenticatedAsync(int fileId, CancellationToken cancellationToken = default)
        {
            const string ErrorMessage = "File does not exist or you do not have access";
            
            var fileToDownload = await _unitOfWork.Repository<File>().FindByIdAsync(fileId, cancellationToken);
            if (fileToDownload is null) return BadRequest(ErrorMessage);

            if (fileToDownload.IsDirectory) return BadRequest("Directory can't be downloaded");

            var filePath = _filePersistenceService.GetFilePath(fileToDownload.UserId, fileToDownload.FileId!.Value);

            return new FileStreamResult(_filePersistenceService.GetFileStream(filePath), fileToDownload.MimeType)
            {
                FileDownloadName = fileToDownload.FileName,
                EnableRangeProcessing = true
            };
        }
        
    }
}