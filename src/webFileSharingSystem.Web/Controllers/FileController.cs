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

        public FileController(IUnitOfWork unitOfWork, ICurrentUserService currentUserService,
            IFilePersistenceService filePersistenceService, IUploadService uploadService)
        {
            _unitOfWork = unitOfWork;
            _currentUserService = currentUserService;
            _filePersistenceService = filePersistenceService;
            _uploadService = uploadService;
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
        [Route("GetSharedWithMe")]
        public async Task<PaginatedList<FileResponse>> GetFilesSharedWithMe([FromQuery] FileRequest request)
        {
            var userId = _currentUserService.UserId;
            return await _unitOfWork.Repository<Share>()
                .PaginatedListFindAsync(request.PageNumber, request.PageSize, 
                    share => ToFileResponse(share.File, userId!.Value)
                    , new GetFilesSharedWithMeSpecs(userId!.Value,request.SearchedPhrase));
        }

        [HttpGet]
        [Route("GetSharedByMe")]
        public async Task<PaginatedList<FileResponse>> GetFilesSharedByMe([FromQuery] FileRequest request)
        {
            var userId = _currentUserService.UserId;
            return await _unitOfWork.Repository<Share>()
                .PaginatedListFindAsync(request.PageNumber, request.PageSize, 
                    share => ToFileResponse(share.File, userId!.Value)
                    , new GetFilesSharedByMeSpecs(userId!.Value,request.SearchedPhrase));
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
            if (await _unitOfWork.Complete() <= 0) return BadRequest("Problem with creating directory");

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

                if (fileToDelete.ParentId is not null)
                {
                    var filesToUpdateSize =
                        await _unitOfWork.CustomQueriesRepository()
                            .GetListOfAllParentsAsFiles(fileToDelete.ParentId.Value);

                    foreach (File fileToUpdate in filesToUpdateSize)
                    {
                        if (fileToUpdate.Size >= fileToDelete.Size)
                            fileToUpdate.Size -= fileToDelete.Size;
                        else 
                            fileToUpdate.Size = 0; //TODO log error message
                        _unitOfWork.Repository<File>().Update(fileToUpdate);
                    }
                }

                var appUser = await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(userId.Value);
                if (appUser is null)
                    return BadRequest($"User not found, userId: {userId}");

                if (appUser.UsedSpace >= fileToDelete.Size)
                    appUser.UsedSpace -= fileToDelete.Size;
                else 
                    appUser.UsedSpace = 0; //TODO log error message
                
                _unitOfWork.Repository<ApplicationUser>().Update(appUser);

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

                if (folderToDelete.ParentId is not null)
                {
                    var filesToUpdateSize =
                        await _unitOfWork.CustomQueriesRepository()
                            .GetListOfAllParentsAsFiles(folderToDelete.ParentId.Value);

                    foreach (File fileToUpdate in filesToUpdateSize)
                    {
                        if (fileToUpdate.Size >= folderToDelete.Size)
                            fileToUpdate.Size -= folderToDelete.Size;
                        else 
                            fileToUpdate.Size = 0; //TODO log error message
                     
                        _unitOfWork.Repository<File>().Update(fileToUpdate);
                    }
                }

                var appUser = await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(userId.Value);
                if (appUser is null)
                    return BadRequest($"User not found, userId: {userId}");

                if (appUser.UsedSpace >= folderToDelete.Size)
                    appUser.UsedSpace -= folderToDelete.Size;
                else 
                    appUser.UsedSpace = 0; //TODO log error message
                
                _unitOfWork.Repository<ApplicationUser>().Update(appUser);


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

                    if (fileToMove.ParentId is not null)
                    {
                        var filesToUpdateSize =
                            await _unitOfWork.CustomQueriesRepository()
                                .GetListOfAllParentsAsFiles(fileToMove.ParentId.Value);

                        foreach (File fileToUpdate in filesToUpdateSize)
                        {
                            if (fileToUpdate.Size >= fileToMove.Size)
                                fileToUpdate.Size -= fileToMove.Size;
                            else 
                                fileToUpdate.Size = 0; //TODO log error message
                            
                            _unitOfWork.Repository<File>().Update(fileToUpdate);
                        }
                    }

                    fileToMove.ParentId = dbParentId;

                    if (dbParentId is not null)
                    {
                        var filesToUpdateSize =
                            await _unitOfWork.CustomQueriesRepository().GetListOfAllParentsAsFiles(dbParentId.Value);

                        foreach (File fileToUpdate in filesToUpdateSize)
                        {
                            fileToUpdate.Size += fileToMove.Size;
                            _unitOfWork.Repository<File>().Update(fileToUpdate);
                        }
                    }

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
            var appUser = await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(userId.Value);
            if (appUser is null)
                return BadRequest($"User not found, userId: {userId}");
            ulong filesToCopyTotalSize = 0;
            
            try
            {
                foreach (var id in ids)
                {
                    var fileToCopy = await _unitOfWork.Repository<File>().FindByIdAsync(id);
                    if (fileToCopy is null) return BadRequest(ErrorMessage);
                    if (fileToCopy.UserId != userId) return Unauthorized(ErrorMessage);

                    var file = new File
                    {
                        UserId = userId.Value,
                        ParentId = dbParentId,
                        FileName = fileToCopy.FileName,
                        MimeType = fileToCopy.MimeType,
                        Size = fileToCopy.Size,
                        IsDirectory = fileToCopy.IsDirectory,
                        FileId = fileToCopy.FileId,
                        FileStatus = FileStatus.Completed,
                    };

                    if (dbParentId is not null)
                    {
                        var parentsToUpdate =
                            await _unitOfWork.CustomQueriesRepository().GetListOfAllParentsAsFiles(dbParentId.Value);

                        foreach (File parentToUpdate in parentsToUpdate)
                        {
                            parentToUpdate.Size += fileToCopy.Size;
                            _unitOfWork.Repository<File>().Update(parentToUpdate);
                        }
                    }

                    _unitOfWork.Repository<File>().Add(file);
                    filesToCopyTotalSize += file.Size;
                }

                if (appUser.UsedSpace + filesToCopyTotalSize > appUser.Quota)
                    return BadRequest("You do not have enough free space to copy these files");
                appUser.UsedSpace += filesToCopyTotalSize;
                _unitOfWork.Repository<ApplicationUser>().Update(appUser);

                if (await _unitOfWork.Complete() > 0) return Ok();
            }
            catch
            {
                return BadRequest("Problem with copying files");
            }

            return BadRequest("Problem with copying files");
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