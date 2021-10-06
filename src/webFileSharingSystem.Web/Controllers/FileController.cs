using System;
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
        private readonly IFilePersistenceService _filePersistenceService;

        public FileController(IUnitOfWork unitOfWork, ICurrentUserService currentUserService,
            IFilePersistenceService filePersistenceService)
        {
            _unitOfWork = unitOfWork;
            _currentUserService = currentUserService;
            _filePersistenceService = filePersistenceService;
        }

        [HttpGet]
        [Route("GetFilePath/{fileId:int}")]
        public async Task<ActionResult<IEnumerable<FilePathPartResponse>>> GetFilePath(int fileId)
        {
            var userId = _currentUserService.UserId;
            var fileToGetPath = await _unitOfWork.Repository<File>().FindByIdAsync(fileId);
            if (fileToGetPath is null) return BadRequest(ErrorMessage);
            if (fileToGetPath.UserId != userId) return Unauthorized(ErrorMessage);

            var filePathParts = await _unitOfWork.CustomQueriesRepository().FindPathToAllParents(fileId);
            return Ok(filePathParts.Reverse().Select(part => new FilePathPartResponse
            {
                Id = part.Id,
                FileName = part.FileName
            }));
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
                }, new GetAllFilesSpecs(userId!.Value, request.ParentId!.Value));
        }


        [HttpGet]
        [Route("GetNames/{parentId:int?}")]
        public async Task<IEnumerable<string>> GetAllFilenamesInFolder(int parentId = -1)
        {
            var dbParentId = parentId == -1 ? (int?) null : parentId;
            var userId = _currentUserService.UserId;
            var files = await _unitOfWork.Repository<File>()
                .FindAsync(new GeFilesNamesSpecs(userId!.Value, dbParentId));
            return files.Select(e => e.FileName);
        }


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
                }, new GetFavouriteFilesSpecs(userId!.Value, request.ParentId!.Value));
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
        public async Task<ActionResult<FileResponse>> CreateDir(string name, [FromQuery] int? parentId)
        {
            var userId = _currentUserService.UserId;

            var file = new File
            {
                FileName = name,
                IsDirectory = true,
                ParentId = parentId,
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
            var fileToDelete = await _unitOfWork.Repository<File>().FindByIdAsync(id);
            if (fileToDelete is null) return BadRequest(ErrorMessage);
            if (fileToDelete.UserId != userId) return Unauthorized(ErrorMessage);
            
            var guidToRemove = fileToDelete.FileId!.Value;

            try
            {
                _filePersistenceService.DeleteExistingFile(userId.Value, guidToRemove);

                _unitOfWork.Repository<File>().Remove(fileToDelete);
                if (await _unitOfWork.Complete() > 0) return Ok();
            }
            catch
            {
                //TODO log exception
                return BadRequest("Problem with deleting file");
            }
            
            return BadRequest("Problem with deleting file");
        }

        [HttpDelete]
        [Route("DeleteDir/{parentId:int}")]
        public async Task<ActionResult> DeleteFolderWithInsideFiles(int parentId)
        {
            var userId = _currentUserService.UserId;
            var folderToDelete = await _unitOfWork.Repository<File>().FindByIdAsync(parentId);
            if (folderToDelete is null) return BadRequest(ErrorMessage);
            if (folderToDelete.UserId != userId) return Unauthorized(ErrorMessage);
            
            var filesToRemove = await _unitOfWork.CustomQueriesRepository().GetListOfAllChildrenAsFiles(parentId);
            var guidsToRemove = filesToRemove.Where(x => !x.IsDirectory).Select(x => x.FileId!.Value);

            try
            {
                foreach (var guid in guidsToRemove)
                {
                    _filePersistenceService.DeleteExistingFile(userId.Value, guid);
                }
                
                _unitOfWork.Repository<File>().RemoveRange(filesToRemove);
                if (await _unitOfWork.Complete() > 0) return Ok();
            }
            catch
            {
                //TODO log exception
                return BadRequest("Error deleting directory");
            }
            
            return BadRequest("Error deleting directory");
        }
        
        [HttpPut]
        [Route("Move/{parentId:int}")]
        public async Task<ActionResult> MoveFiles(int parentId, [FromBody] int[] ids)
        {
            var dbParentId = parentId == -1 ? (int?) null : parentId;
            //TODO check if names of files to move are uniq in target directory
            var userId = _currentUserService.UserId;
            try
            {
                foreach (var id in ids)
                {
                    var fileToMove = await _unitOfWork.Repository<File>().FindByIdAsync(id);
                    if (fileToMove is null) return BadRequest(ErrorMessage);
                    if (fileToMove.UserId != userId) return Unauthorized(ErrorMessage);
                    fileToMove.ParentId = dbParentId;
                    _unitOfWork.Repository<File>().Update(fileToMove);
                }
                if (await _unitOfWork.Complete() > 0) return Ok();
            }
            catch
            {
                return BadRequest("Problem with moving files");
            }
            return BadRequest("Problem with moving files");
        }
        
        [HttpPost]
        [Route("Copy/{parentId:int}")]
        public async Task<ActionResult> CopyFiles(int parentId, [FromBody] int[] ids)
        {
            var dbParentId = parentId == -1 ? (int?) null : parentId;
            //TODO check if names of files to move are uniq in target directory
            var userId = _currentUserService.UserId;
            try
            {
                foreach (var id in ids)
                {
                    var fileToCopy = await _unitOfWork.Repository<File>().FindByIdAsync(id);
                    if (fileToCopy is null) return BadRequest(ErrorMessage);
                    if (fileToCopy.UserId != userId) return Unauthorized(ErrorMessage);
                    
                    var file = new File
                    {
                        FileName = fileToCopy.FileName,
                        IsDirectory = fileToCopy.IsDirectory,
                        ParentId = dbParentId,
                        UserId = userId.Value,
                    };

                    _unitOfWork.Repository<File>().Add(file);
                }
                if (await _unitOfWork.Complete() > 0) return Ok();
            }
            catch
            {
                return BadRequest("Problem with copying files");
            }
            return BadRequest("Problem with copying files");
        }
        
    }
}