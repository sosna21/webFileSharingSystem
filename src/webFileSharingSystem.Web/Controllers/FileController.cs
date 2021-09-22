using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Specifications;
using webFileSharingSystem.Web.Contracts.Requests;
using webFileSharingSystem.Web.Contracts.Responses;

namespace webFileSharingSystem.Web.Controllers
{
    public class FileController : BaseController
    {
        private const string ErrorMessage = "File does not exist or you do not have access";
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentUserService _currentUserService;

        public FileController(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
        {
            _unitOfWork = unitOfWork;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [Route("GetAll")]
        public async Task<PaginatedList<FileResponse>> GetAllFilesAsync([FromQuery] FileRequest request)
        {
            var userId = _currentUserService.UserId;
            return await _unitOfWork.Repository<File>()
                .PaginatedListFindAsync(request.PageNumber, request.PageSize, file => new FileResponse
                {
                    Id = file.Id,
                    FileName = file.FileName,
                    MimeType = file.MimeType,
                    Size = file.Size,
                    IsShared = file.IsShared,
                    IsFavourite = file.IsFavourite,
                    IsDirectory = file.IsDirectory,
                    ModificationDate = file.LastModified ?? file.Created
                }, new GetAllFilesSpecs(userId!.Value));
        }
        
        [HttpDelete]
        [Route("Delete/{id:int}")]
        public async Task<ActionResult> DeleteFileAsync(int id)
        {
            var userId = _currentUserService.UserId;
            var fileToUpdate = await _unitOfWork.Repository<File>().FindByIdAsync(id);
            if (fileToUpdate is null) return BadRequest(ErrorMessage);
            if (fileToUpdate.UserId != userId) return Unauthorized(ErrorMessage);
            fileToUpdate.IsDeleted = true;
            _unitOfWork.Repository<File>().Update(fileToUpdate);
            if (await _unitOfWork.Complete() > 0) return Ok();
            
            return BadRequest("Problem deleting the file");
        }
    }
}