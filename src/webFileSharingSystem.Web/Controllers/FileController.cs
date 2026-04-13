using System;
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

        [HttpGet]
        [Route("GetFilePath/{fileId:int}")]
        public async Task<ActionResult<IEnumerable<FilePathPartResponse>>> GetFilePath(int fileId)
        {
            var (operationResult, pathParts) =
                await _fileService.GetPathToFileAsync(fileId, _currentUserService.UserId!.Value);

            if (operationResult.Succeeded)
                return Ok(pathParts!.Select(part => new FilePathPartResponse
                {
                    Id = part.Id,
                    FileName = part.FileName,
                    Level = part.Level,
                    AccessMode = part.AccessMode,
                    ValidUntil = part.ValidUntil
                }));

            return operationResult.ToActionResult(ErrorMessage);
        }

        [HttpGet]
        [Route("GetAll")]
        public async Task<PaginatedList<FileResponse>> GetAllFilesAsync([FromQuery] FileRequest request)
        {
            var userId = _currentUserService.UserId;

            if (string.IsNullOrEmpty(request.SearchedPhrase))
            {
                var files = await _unitOfWork.Repository<File>()
                    .PaginatedListFindAsync(request.PageNumber, request.PageSize,
                        ToFileResponse,
                        new GetAllFilesSpecs(userId!.Value, request.ParentId));
                return files;
            }

            if (request.ParentId is null)
                return await _unitOfWork.Repository<File>().PaginatedListFindAsync(request.PageNumber, request.PageSize,
                    ToFileResponse,
                    new GetSearchedFilesSpec(userId!.Value, request.SearchedPhrase!));

            var filteredFiles = await _unitOfWork.Repository<File>()
                .PaginatedListFindAsync(request.PageNumber, request.PageSize,
                    ToFileResponse,
                    _unitOfWork.CustomQueriesRepository().GetFilteredListOfAllChildrenAsFilesQuery(
                        request.ParentId.Value, new GetSearchedFilesSpec(userId!.Value, request.SearchedPhrase!)));

            return filteredFiles;
        }

        [HttpGet]
        [Route("GetNames/{parentId:int?}")]
        public async Task<IEnumerable<string>> GetAllFilenamesInFolder(int parentId = -1)
        {
            var dbParentId = parentId == -1 ? (int?)null : parentId;
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
                    file => ToFileResponse(file),
                    new GetFavouriteFilesSpecs(userId!.Value, request.SearchedPhrase));
        }


        [HttpGet]
        [Route("GetRecent")]
        public async Task<PaginatedList<FileResponse>> GetRecentFilesAsync([FromQuery] FileRequest request)
        {
            var userId = _currentUserService.UserId;
            return await _unitOfWork.Repository<File>()
                .PaginatedListFindAsync(request.PageNumber, request.PageSize,
                    file => ToFileResponse(file)
                    , new GetRecentFilesSpecs(userId!.Value, request.SearchedPhrase));
        }

        [HttpGet]
        [Route("GetSharedByMe")]
        public async Task<PaginatedList<FileResponse>> GetFilesSharedByMe([FromQuery] FileRequest request)
        {
            var userId = _currentUserService.UserId!.Value;
            var files = await _unitOfWork.Repository<Share>()
                .PaginatedListFindAsync<File, FileResponse>(
                    request.PageNumber,
                    request.PageSize,
                    file => ToFileResponse(file),
                    new GetSharedByUserFilesSpec(userId, request.SearchedPhrase)
                );

            return files;
        }

        [HttpGet]
        [Route("GetSharedWithMe")]
        public async Task<PaginatedList<SharedFileResponse>> GetFilesSharedWithMe([FromQuery] FileRequest request)
        {
            var userId = _currentUserService.UserId;
            if (string.IsNullOrEmpty(request.SearchedPhrase))
            {
                var sharedFiles = await _unitOfWork.Repository<SharedFileSqlRow>()
                    .PaginatedListFindAsync(request.PageNumber, request.PageSize,
                        ToSharedFileResponse,
                        _unitOfWork.CustomQueriesRepository().GetListOfSharedFilesQuery(userId!.Value, request.ParentId,
                            new GetSharedFilesSpec(request.ParentId, request.SearchedPhrase)));
                return sharedFiles;
            }

            var filteredFiles = await _unitOfWork.Repository<SharedFileSqlRow>()
                .PaginatedListFindAsync(request.PageNumber, request.PageSize,
                    ToSharedFileResponse,
                    _unitOfWork.CustomQueriesRepository().GetListOfSharedFilesSubtreeQuery(userId!.Value, request.ParentId,
                        new GetSharedFilesSpec(request.ParentId, request.SearchedPhrase)));
            return filteredFiles;
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
            var userId = _currentUserService.UserId;
            var (actionResult, file) =
                await _fileService.CreateDirectoryAsync(parentId, _currentUserService.UserId!.Value, name);

            if (!actionResult.Succeeded)
                return actionResult.ToActionResult(actionResult.Errors.Length > 0
                ? actionResult.Errors[0]
                : "Unknown problem with creating a directory");
            return Ok(ToFileResponse(file!));
        }

        [HttpDelete]
        [Route("Delete/{id:int}")]
        public async Task<ActionResult> DeleteAsync(int id)
        {
            var result = await _fileService.DeleteAsync(id, _currentUserService.UserId!.Value);
            return result.ToActionResult("Problem with deleting the item");
        }

        [HttpPut]
        [Route("Move/{parentId:int}")]
        public async Task<ActionResult> MoveFiles(int parentId, [FromBody] int[] ids)
        {
            var userId = _currentUserService.UserId;
            var dbParentId = parentId == -1 ? (int?)null : parentId;
            var (result, ctx) = await _fileService.MoveFilesAsync(dbParentId, ids, userId!.Value);
            if (!result.Succeeded) return result.ToActionResult(string.Join(", ", result.Errors));

            if (ctx!.First().IsOwnFile)
            {
                var response = ctx.Select(c => ToFileResponse(c.File));
                return Ok(response);
            }

            var sharedFilesResponse = ctx.Select(ToSharedFileResponse);
            return Ok(sharedFilesResponse);
        }

        [HttpPost]
        [Route("Copy/{parentId:int}")]
        public async Task<ActionResult> CopyFiles(int parentId, [FromBody] int[] ids)
        {
            var userId = _currentUserService.UserId;
            var dbParentId = parentId == -1 ? (int?)null : parentId;
            var (result, ctx) = await _fileService.CopyFilesAsync(dbParentId, ids, _currentUserService.UserId!.Value);
            if (!result.Succeeded) return result.ToActionResult(string.Join(", ", result.Errors));

            if (ctx!.First().IsOwnFile)
            {
                var response = ctx.Select(c => ToFileResponse(c.File));
                return Ok(response);
            }

            var sharedFilesResponse = ctx.Select(ToSharedFileResponse);
            return Ok(sharedFilesResponse);
        }

        private FileResponse ToFileResponse(File file)
        {
            var activeShares = file.Shares.Where(IsActiveShare).ToArray();
            var hasIndefiniteShare = activeShares.Any(share => share.ValidUntil is null);
            var sharedUntil = hasIndefiniteShare
                ? null
                : activeShares.Where(share => share.ValidUntil.HasValue)
                    .Select(share => share.ValidUntil!.Value)
                    .Cast<DateTime?>()
                    .Max();

            return new FileResponse
            {
                Id = file.Id,
                ParentId = file.ParentId,
                FileName = file.FileName,
                MimeType = file.MimeType,
                Size = file.Size,
                IsShared = activeShares.Length > 0,
                SharedUntil = sharedUntil is not null ? DateTime.SpecifyKind(sharedUntil.Value, DateTimeKind.Utc) : null,
                IsFavourite = file.IsFavourite,
                IsDirectory = file.IsDirectory,
                ModificationDate = DateTime.SpecifyKind(file.LastModified ?? file.Created, DateTimeKind.Utc),
                FileStatus = file.FileStatus,
                PartialFileInfo =  _uploadService.GetCachedPartialFileInfo(file.CreatedBy, file.Id) ?? file.PartialFileInfo,
                UploadProgress = CalculateUploadProgress(
                    _uploadService.GetCachedPartialFileInfo(file.CreatedBy, file.Id) ?? file.PartialFileInfo),
                CreatedBy = file.CreatedBy,
                CreatedByUserName = file.Creator.UserName ?? file.Creator.EmailAddress!,
                CreatedByPhotoUrl = GetPhotoUrl(file.Creator.PhotoAccessId)
            };
        }

        private SharedFileResponse ToSharedFileResponse(SharedFileSqlRow sharedFile)
        {
            var partialFileInfo = _uploadService.GetCachedPartialFileInfo(sharedFile.FileCreatedBy, sharedFile.Id) ??
                                  (sharedFile.PartialFileInfoId.HasValue
                                      ? new PartialFileInfo
                                      {
                                          FileId = sharedFile.Id,
                                          FileSize = sharedFile.UploadFileSize!.Value,
                                          ChunkSize = sharedFile.ChunkSize!.Value,
                                          PersistenceMap = sharedFile.PersistenceMap!,
                                      }
                                      : null);

            return new SharedFileResponse
            {
                Id = sharedFile.Id,
                UserId = sharedFile.UserId,
                ParentId = sharedFile.ParentId,
                FileName = sharedFile.FileName,
                MimeType = sharedFile.MimeType,
                Size = sharedFile.Size,
                IsDirectory = sharedFile.IsDirectory,
                SharedUserName = sharedFile.SharedUserName,
                SharedUserPhotoUrl = GetPhotoUrl(sharedFile.SharedUserPhotoAccessId),
                AccessMode = sharedFile.AccessMode,
                ValidUntil = sharedFile.ValidUntil is not null ? DateTime.SpecifyKind(sharedFile.ValidUntil.Value, DateTimeKind.Utc) : null,
                FileStatus = sharedFile.FileStatus,
                CreatedBy = sharedFile.FileCreatedBy,
                CreatedByUserName = sharedFile.FileCreatedByUserName ?? sharedFile.FileCreatedByEmail!,
                CreatedByPhotoUrl = GetPhotoUrl(sharedFile.CreatedByPhotoAccessId), 
                PartialFileInfo = partialFileInfo,
                UploadProgress = CalculateUploadProgress(partialFileInfo)
            };
        }

        private SharedFileResponse ToSharedFileResponse(FileOperationContext ctx)
        {
            var file = ctx.File;
            return new SharedFileResponse
            {
                Id = file.Id,
                UserId = file.UserId,
                ParentId = file.ParentId,
                FileName = file.FileName,
                MimeType = file.MimeType,
                Size = file.Size,
                IsDirectory = file.IsDirectory,
                SharedUserName = ctx.SharedUserName!,
                AccessMode = ctx.AccessMode!.Value,
                ValidUntil = ctx.ValidUntil is not null
                    ? DateTime.SpecifyKind(ctx.ValidUntil.Value, DateTimeKind.Utc)
                    : null,
                CreatedBy = file.CreatedBy,
                CreatedByUserName = file.Creator.UserName ?? file.Creator.EmailAddress!,
                CreatedByPhotoUrl = GetPhotoUrl(file.Creator.PhotoAccessId),
                SharedUserPhotoUrl = null,
                FileStatus = file.FileStatus,
                PartialFileInfo = file.PartialFileInfo,
                UploadProgress = 0
            };
        }

        private static bool IsActiveShare(Share share)
        {
            return share.RevokedAt is null &&
                   (share.ValidUntil is null || share.ValidUntil.Value > DateTime.UtcNow);
        }

        private static double? CalculateUploadProgress(PartialFileInfo? partialFileInfo)
        {
            if (partialFileInfo is null) return null;
            var uploadedChunks = partialFileInfo.PersistenceMap
                .GetAllIndexesWithValue(false, maxIndex: partialFileInfo.NumberOfChunks - 1).Length;
            return (double)uploadedChunks / partialFileInfo.NumberOfChunks;
        }
        
        private string? GetPhotoUrl(Guid? photoAccessId)
        {
            if (!photoAccessId.HasValue)
                return null;

            return Url.ActionLink("GetPhotoById", "User", new { photoId = photoAccessId.Value });
        }
    }
}