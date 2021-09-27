using System.Collections.Generic;
using System.Linq;
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
                },new GetAllFilesSpecs(userId!.Value, request.ParentId!.Value));
        }
        
        //
        // [HttpGet]
        // [Route("GetNames/{parentId:int?}")]
        // public async Task<IEnumerable<string>> GetAllFilenamesInFolder(int parentId = -1)
        // {
        //     var dbParentId = parentId == -1 ? (int?)null : parentId;
        //     var userId = _currentUserService.UserId;
        //     var files =  await _unitOfWork.Repository<File>().FindAsync(new GeFilesNamesSpecs(userId!.Value,dbParentId));
        //     return files.Select(e => e.FileName);
        // }
        


        [HttpGet]
        [Route("GetFavourites")]
        public async Task<PaginatedList<FileResponse>> GetFavouritesFilesAsync([FromQuery] FileRequest request)
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
                }, new GetFavouriteFilesSpecs(userId!.Value,request.ParentId!.Value));
        }


        [HttpGet]
        [Route("GetDeleted")]
        public async Task<PaginatedList<FileResponse>> GetDeletedFilesAsync([FromQuery] FileRequest request)
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
                }, new GetDeletedFilesSpecs(userId!.Value, request.ParentId!.Value));
        }


        [HttpGet]
        [Route("GetRecent")]
        public async Task<PaginatedList<FileResponse>> GetRecentFilesAsync([FromQuery] FileRequest request)
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
                }, new GetRecentFilesSpecs(userId!.Value));
        }


        [HttpPut]
        [Route("SetFavourite/{id:int}")]
        public async Task<ActionResult> SetFavourite(int id, [FromQuery] bool value)
        {
            var userId = _currentUserService.UserId;
            var fileToUpdate = await _unitOfWork.Repository<File>().FindByIdAsync(id);
            if (fileToUpdate is null) return BadRequest(ErrorMessage);
            if (fileToUpdate.UserId != userId) return Unauthorized(ErrorMessage);
            fileToUpdate.IsFavourite = value;
            _unitOfWork.Repository<File>().Update(fileToUpdate);
            if (await _unitOfWork.Complete() > 0) return Ok();
            return BadRequest("Problem deleting the file");
        }

        [HttpPut]
        [Route("Rename/{id:int}")]
        public async Task<ActionResult> SetFavourite(int id, [FromQuery] string name)
        {
            var userId = _currentUserService.UserId;
            var fileToUpdate = await _unitOfWork.Repository<File>().FindByIdAsync(id);
            if (fileToUpdate is null) return BadRequest(ErrorMessage);
            if (fileToUpdate.UserId != userId) return Unauthorized(ErrorMessage);
            fileToUpdate.FileName = name;
            _unitOfWork.Repository<File>().Update(fileToUpdate);
            if (await _unitOfWork.Complete() > 0) return Ok();
            return BadRequest("Problem with renaming the file");
        }


        [HttpPost]
        [Route("CreateDir/{name}")]
        public async Task<ActionResult<FileResponse>> CreateDir(string name)
        {
            var userId = _currentUserService.UserId;

            var file = new File
            {
                FileName = name,
                IsDirectory = true,
                UserId = userId!.Value
            };

            _unitOfWork.Repository<File>().Add(file);
            if (await _unitOfWork.Complete() <= 0) return BadRequest("Problem with renaming the file");

            return new FileResponse
            {
                Id = file.Id,
                FileName = file.FileName,
                MimeType = file.MimeType,
                Size = file.Size,
                IsShared = file.IsShared,
                IsFavourite = file.IsFavourite,
                IsDirectory = file.IsDirectory,
                ModificationDate = file.LastModified ?? file.Created
            };
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