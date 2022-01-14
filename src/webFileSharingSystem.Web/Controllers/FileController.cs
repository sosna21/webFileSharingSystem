using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Specifications;
using webFileSharingSystem.Core.Storage;
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
        private readonly IUploadService _uploadService;
        private readonly IFileService _fileService;

        public FileController(IUnitOfWork unitOfWork, ICurrentUserService currentUserService,
            IFilePersistenceService filePersistenceService, IUploadService uploadService, IFileService fileService)
        {
            _unitOfWork = unitOfWork;
            _currentUserService = currentUserService;
            _filePersistenceService = filePersistenceService;
            _uploadService = uploadService;
            _fileService = fileService;
        }

        //candidate
        [HttpGet]
        [Route("GetFilePath/{fileId:int}")]
        public async Task<ActionResult<IEnumerable<FilePathPartResponse>>> GetFilePath(int fileId)
        {
            
           var (operationResult, pathParts) = await _fileService.GetPathToFileAsync(fileId, _currentUserService.UserId!.Value);

           if (operationResult.Succeeded)
               return Ok(pathParts.Select(part => new FilePathPartResponse
               {
                   Id = part.Id,
                   FileName = part.FileName
               }));
           
           return operationResult.ToActionResult(ErrorMessage);
        }

        [HttpGet]
        [Route("GetAll")]
        public async Task<PaginatedList<FileResponse>> GetAllFilesAsync([FromQuery] FileRequest request)
        {
            var userId = _currentUserService.UserId;

            if (string.IsNullOrEmpty(request.SearchedPhrase))
                return await _unitOfWork.Repository<File>()
                    .PaginatedListFindAsync(request.PageNumber, request.PageSize,
                        file => ToFileResponse(file, userId!.Value),
                        new GetAllFilesSpecs(userId!.Value, request.ParentId));

            if (request.ParentId is null)
                return await _unitOfWork.Repository<File>().PaginatedListFindAsync(request.PageNumber, request.PageSize,
                    file => ToFileResponse(file, userId!.Value),
                    new GetSearchedFilesSpec(userId!.Value, request.SearchedPhrase!));

            return await _unitOfWork.Repository<File>()
                .PaginatedListFindAsync(request.PageNumber, request.PageSize,
                    file => ToFileResponse(file, userId!.Value),
                    _unitOfWork.CustomQueriesRepository().GetFilteredListOfAllChildrenAsFilesQuery(
                        request.ParentId.Value, new GetSearchedFilesSpec(userId!.Value, request.SearchedPhrase!)));
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
                .PaginatedListFindAsync(request.PageNumber, request.PageSize, 
                    file => ToFileResponse(file, userId!.Value),
                    new GetFavouriteFilesSpecs(userId!.Value, request.SearchedPhrase));
        }

        //TODO Get Deleted are not currently supported
        [HttpGet]
        [Route("GetDeleted")]
        public async Task<PaginatedList<FileResponse>> GetDeletedFilesAsync([FromQuery] FileRequest request)
        {
            var userId = _currentUserService.UserId;
            return await _unitOfWork.Repository<File>()
                .PaginatedListFindAsync(request.PageNumber, request.PageSize, 
                    file => ToFileResponse(file, userId!.Value)
                    ,  new GetDeletedFilesSpecs(userId!.Value, request.ParentId!.Value));
        }
        
        [HttpGet]
        [Route("GetRecent")]
        public async Task<PaginatedList<FileResponse>> GetRecentFilesAsync([FromQuery] FileRequest request)
        {
            var userId = _currentUserService.UserId;
            return await _unitOfWork.Repository<File>()
                .PaginatedListFindAsync(request.PageNumber, request.PageSize, 
                    file => ToFileResponse(file, userId!.Value)
                    , new GetRecentFilesSpecs(userId!.Value,request.SearchedPhrase));
        }
        
        [HttpGet]
        [Route("GetSharedByMe")]
        public async Task<PaginatedList<FileResponse>> GetFilesSharedByMe([FromQuery] FileRequest request)
        {
            var userId = _currentUserService.UserId!.Value;
            return await _unitOfWork.Repository<File>()
                .PaginatedListFindAsync(request.PageNumber, request.PageSize,
                    file => ToFileResponse(file, userId),
                    _unitOfWork.CustomQueriesRepository().
                        GetListOfFilesSharedByUserIdQuery(userId, new GetSharedFilesSpec<File>(request.ParentId,request.SearchedPhrase)));
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
        public async Task<ActionResult> Rename(int id, [FromQuery] string name)
        {
            return (await _fileService.RenameFileAsync(id, _currentUserService.UserId!.Value, name))
                .ToActionResult("Problem with renaming the file");
        }
        
        [HttpPost]
        [Route("CreateDir/{name}")]
        public async Task<ActionResult<FileResponse>> CreateDir(string name, [FromQuery] int? parentId = null)
        {
            return (await _fileService.CreateDirectoryAsync(parentId, _currentUserService.UserId!.Value, name))
                .ToActionResult("Problem with creating a directory");
        }
        
        [HttpDelete]
        [Route("Delete/{id:int}")]
        public async Task<ActionResult> DeleteFileAsync(int id)
        {
            return (await _fileService.DeleteFileAsync(id, _currentUserService.UserId!.Value))
                .ToActionResult("Problem with deleting the file");
        }
        
        [HttpDelete]
        [Route("DeleteDir/{parentId:int}")]
        public async Task<ActionResult> DeleteFolderWithInsideFiles(int parentId)
        {
            return (await _fileService.DeleteDirectoryAsync(parentId, _currentUserService.UserId!.Value))
                .ToActionResult("Problem with deleting the directory");
        }
        
        [HttpPut]
        [Route("Move/{parentId:int}")]
        public async Task<ActionResult> MoveFiles(int parentId, [FromBody] int[] ids)
        {
            var dbParentId = parentId == -1 ? (int?) null : parentId;
            return (await _fileService.MoveFilesAsync(dbParentId, ids, _currentUserService.UserId!.Value))
                .ToActionResult("Problem with moving files");
        }
        
        [HttpPost]
        [Route("Copy/{parentId:int}")]
        public async Task<ActionResult> CopyFiles(int parentId, [FromBody] int[] ids)
        {
            var dbParentId = parentId == -1 ? (int?) null : parentId;
            //TODO check if names of files to move are uniq in target directory
            return (await _fileService.CopyFilesAsync(dbParentId, ids, _currentUserService.UserId!.Value))
                .ToActionResult("Problem with coping files");
        }
        
        private FileResponse ToFileResponse(File file, int userId)
        {
            return new FileResponse
            {
                Id = file.Id,
                FileName = file.FileName,
                MimeType = file.MimeType,
                Size = file.Size,
                IsShared = file.IsShared,
                IsFavourite = file.IsFavourite,
                IsDirectory = file.IsDirectory,
                ModificationDate = file.LastModified ?? file.Created,
                FileStatus = file.FileStatus,
                PartialFileInfo = file.PartialFileInfo,
                UploadProgress = CalculateUploadProgress(
                    _uploadService.GetCachedPartialFileInfo(userId, file.Id) ?? file.PartialFileInfo)
            };
        }

        private static double? CalculateUploadProgress(PartialFileInfo? partialFileInfo)
        {
            if (partialFileInfo is null) return null;
            var uploadedChunks = partialFileInfo.PersistenceMap
                .GetAllIndexesWithValue(false, maxIndex: partialFileInfo.NumberOfChunks - 1).Length;
            return (double) uploadedChunks / partialFileInfo.NumberOfChunks;
        }
    }
}