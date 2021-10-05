using System.Threading;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Interfaces;

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
            
            Response.Headers.Add( HeaderNames.ContentDisposition, $"attachment; filename=\"{fileToDownload.FileName}\"" );
            Response.Headers.Add( HeaderNames.ContentType, fileToDownload.MimeType );

            await _filePersistenceService.GetFileStream(filePath, Response.Body, cancellationToken);

            return Ok();
        }
        
        [AllowAnonymous]
        [HttpGet]
        [Route("{fileId:int}/Anonymous")]
        public async Task<ActionResult> DownloadFileUnauthenticatedAsync(int fileId, CancellationToken cancellationToken = default)
        {
            const string ErrorMessage = "File does not exist or you do not have access";
            
            var fileToDownload = await _unitOfWork.Repository<File>().FindByIdAsync(fileId, cancellationToken);
            if (fileToDownload is null) return BadRequest(ErrorMessage);

            if (fileToDownload.IsDirectory) return BadRequest("Directory can't be downloaded");

            var filePath = _filePersistenceService.GetFilePath(fileToDownload.UserId, fileToDownload.FileId!.Value);
            
            Response.Headers.Add( HeaderNames.ContentDisposition, $"attachment; filename=\"{fileToDownload.FileName}\"" );
            Response.Headers.Add( HeaderNames.ContentType, fileToDownload.MimeType );

            await _filePersistenceService.GetFileStream(filePath, Response.Body, cancellationToken);

            return Ok();
        }
        
    }
}