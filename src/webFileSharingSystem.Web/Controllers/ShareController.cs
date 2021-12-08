using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Xml;
using Microsoft.AspNetCore.Mvc;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Specifications;
using webFileSharingSystem.Web.Contracts.Requests;
using webFileSharingSystem.Web.Contracts.Responses;

namespace webFileSharingSystem.Web.Controllers
{
    public class ShareController : BaseController
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentUserService _currentUserService;
        private readonly IFilePersistenceService _filePersistenceService;
        private const string ErrorMessage = "File does not exist or you do not have access";

        public ShareController(IUnitOfWork unitOfWork, ICurrentUserService currentUserService, IFilePersistenceService filePersistenceService)
        {
            _unitOfWork = unitOfWork;
            _currentUserService = currentUserService;
            _filePersistenceService = filePersistenceService;
        }

        [HttpPost]
        [Route("{fileId:int}/Add")]
        public async Task<ActionResult> AddShareAsync(int fileId, [FromBody] AddFileShareRequest request,
            CancellationToken cancellationToken = default)
        {
            var userId = _currentUserService.UserId;

            var applicationUser = (await _unitOfWork.Repository<ApplicationUser>()
                    .FindAsync(new FindUserByUserNameSpecs(request.UserNameToShareWith), cancellationToken))
                .SingleOrDefault();

            if (applicationUser is null) return BadRequest("Ups, something went wrong");

            if (userId == applicationUser.Id) return BadRequest("You can't share file with yourself");

            var fileToShare = await _unitOfWork.Repository<File>().FindByIdAsync(fileId, cancellationToken);
            if (fileToShare is null) return BadRequest("File doesn't exist or you do not have access");

            var existingShare = (await _unitOfWork.Repository<Share>()
                    .FindAsync(new FindSharesWithByUserIdAndFileId(applicationUser.Id, fileId), cancellationToken))
                .SingleOrDefault();

            if (request.Update is null)
            {
                if (existingShare is not null) return BadRequest("File is already shared with that user");
                
                    _unitOfWork.Repository<Share>().Add(new Share
                    {
                        SharedByUserId = userId!.Value,
                        SharedWithUserId = applicationUser.Id,
                        FileId = fileId,
                        AccessMode = request.AccessMode,
                        ValidUntil = request.AccessDuration is null ? DateTime.MaxValue : DateTime.Now + XmlConvert.ToTimeSpan(request.AccessDuration)
                    });

                fileToShare.IsShared = true;
                _unitOfWork.Repository<File>().Update(fileToShare);
            }
            else
            {
                if (existingShare is null) return BadRequest("This share does not exist, so can not be updated");

                existingShare.AccessMode = request.AccessMode;
                existingShare.ValidUntil = DateTime.Now + XmlConvert.ToTimeSpan(request.AccessDuration);

                _unitOfWork.Repository<Share>().Update(existingShare);
            }

            if (await _unitOfWork.Complete(cancellationToken) > 0) return Ok();

            return BadRequest("Problem with adding share");
        }
        
        [HttpGet]
        [Route("GetNames/{parentId:int?}")]
        public async Task<IEnumerable<string>> GetAllSharedFilenamesInFolder(int parentId = -1)
        {
            var dbParentId = parentId == -1 ? (int?) null : parentId;
            var userId = _currentUserService.UserId;
            //TODO temporary solution - resolve in another way
            var sharedFiles = _unitOfWork.CustomQueriesRepository().GetListOfSharedFilesQuery(userId!.Value, dbParentId, 
                new GetSharedFilesSpec2<SharedFile>(dbParentId, ""));
            return sharedFiles.Select(e => e.FileName);
        }
        
        [HttpPut]
        [Route("Rename/{id:int}")]
        public async Task<ActionResult> Rename(int id, [FromQuery] string name)
        {
            var userId = _currentUserService.UserId!.Value;
            var accessMode = await _unitOfWork.CustomQueriesRepository().GetSharedFileAccessMode(id, userId);
            if (accessMode is null ) return BadRequest(ErrorMessage);
            if (accessMode.AccessMode == ShareAccessMode.ReadOnly) return Unauthorized(ErrorMessage);
            
            var fileToUpdate = await _unitOfWork.Repository<File>().FindByIdAsync(id);
            if (fileToUpdate is null) return BadRequest(ErrorMessage);
            
            fileToUpdate.FileName = name;
            _unitOfWork.Repository<File>().Update(fileToUpdate);
            if (await _unitOfWork.Complete() > 0) return Ok();
            return BadRequest("Problem with renaming the file");
        }
        
        [HttpDelete]
        [Route("RemoveShare/{fileId:int}")]
        public async Task<ActionResult> RemoveShare(int fileId)
        {
            var userId = _currentUserService.UserId!.Value;
            var shareToRemove = (await _unitOfWork.Repository<Share>()
                .FindAsync(new FindSharesWithByUserIdAndFileId(userId, fileId))).FirstOrDefault();
            
            if (shareToRemove is null) return BadRequest("To delete this share you must delete whole shared folder.");
            _unitOfWork.Repository<Share>().Remove(shareToRemove);
            if (await _unitOfWork.Complete() > 0) return Ok();
            return BadRequest("Problem with removing this share/s");
        }
        
        [HttpPost]
        [Route("CreateDir/{name}")]
        public async Task<ActionResult<FileResponse>> CreateDir(string name, [FromQuery] int parentId)
        {
            var userId = _currentUserService.UserId!.Value;

            var accessMode = await _unitOfWork.CustomQueriesRepository().GetSharedFileAccessMode(parentId, userId);
            if (accessMode is null ) return BadRequest("Can not find associated share");
            if (accessMode.AccessMode == ShareAccessMode.ReadOnly) return Unauthorized("You do not have permission to execute this action");
            var parentFile = await _unitOfWork.Repository<File>().FindByIdAsync(parentId);
            if (parentFile is null) return BadRequest("Can not find shared file owner");

            var file = new File
            {
                FileName = name,
                IsDirectory = true,
                ParentId = parentId,
                UserId = parentFile.UserId
            };

            _unitOfWork.Repository<File>().Add(file);
            if (await _unitOfWork.Complete() <= 0) return BadRequest("Problem with creating directory");

            return Ok();
        }
        
        [HttpDelete]
        [Route("DeleteFile/{id:int}")]
        public async Task<ActionResult> DeleteFileAsync(int id)
        {
            var userId = _currentUserService.UserId!.Value;
            var fileToDelete = await _unitOfWork.Repository<File>().FindByIdAsync(id);
            if (fileToDelete is null) return BadRequest(ErrorMessage);
            var fileOwnerUserId = fileToDelete.UserId;
            
            var accessMode = await _unitOfWork.CustomQueriesRepository().GetSharedFileAccessMode(id, userId);
            if (accessMode is null ) return BadRequest(ErrorMessage);
            if (accessMode.AccessMode != ShareAccessMode.FullAccess) return Unauthorized(ErrorMessage);

            var guidToRemove = fileToDelete.FileId!.Value;

            try
            {
                _filePersistenceService.DeleteExistingFile(fileOwnerUserId, guidToRemove);

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

                var appUser = await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(fileToDelete.UserId);
                if (appUser is null)
                    return BadRequest($"User not found, userId: {fileOwnerUserId}");

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
        public async Task<ActionResult> DeleteFolderWithInsideFilesAsync(int parentId)
        {
            var userId = _currentUserService.UserId!.Value;
            
            var accessMode = await _unitOfWork.CustomQueriesRepository().GetSharedFileAccessMode(parentId, userId);
            if (accessMode is null ) return BadRequest(ErrorMessage);
            if (accessMode.AccessMode != ShareAccessMode.FullAccess) return Unauthorized(ErrorMessage);
            var folderToDelete = await _unitOfWork.Repository<File>().FindByIdAsync(parentId);
            if (folderToDelete is null) return BadRequest(ErrorMessage);
            var filesOwnerUserId = folderToDelete.UserId;
            
            var filesToRemove = await _unitOfWork.CustomQueriesRepository().GetListOfAllChildrenAsFiles(parentId);
            var guidsToRemove = filesToRemove.Where(x => !x.IsDirectory).Select(x => x.FileId!.Value);

            try
            {
                foreach (var guid in guidsToRemove)
                {
                    _filePersistenceService.DeleteExistingFile(filesOwnerUserId, guid);
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

                var appUser = await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(filesOwnerUserId);
                if (appUser is null)
                    return BadRequest($"User not found, userId: {filesOwnerUserId}");

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


        [HttpDelete]
        [Route("Delete/{id:int}")]
        public async Task<ActionResult> DeleteShareAsync(int id)
        {
            const string ErrorMessage = "File is not shared with anybody or you do not have access";
            var userId = _currentUserService.UserId;
            var shareToDelete = await _unitOfWork.Repository<Share>().FindByIdAsync(id);
            if (shareToDelete is null) return BadRequest(ErrorMessage);
            if (shareToDelete.SharedByUserId != userId) return Unauthorized(ErrorMessage);

            _unitOfWork.Repository<Share>().Update(shareToDelete);
            if (await _unitOfWork.Complete() > 0) return Ok();

            return BadRequest("Problem with deleting share");
        }

        [HttpGet]
        [Route("GetShares/{fileId:int}")]
        public async Task<IList<ShareResponse>> GetShares(int fileId)
        {
            var userId = _currentUserService.UserId;

            var shares = await _unitOfWork.Repository<Share>()
                .FindAsync(new GetShareByUserAndFileIdSpecs(userId!.Value, fileId));

            var shareResponses = new List<ShareResponse>();
            foreach (var share in shares)
            {
                var userName = (await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(share.SharedWithUserId))!.UserName;
                shareResponses.Add(new ShareResponse
                {
                    SharedWithUserName = userName!,
                    AccessMode = share.AccessMode,
                    ValidUntil = share.ValidUntil
                });
            }

            return shareResponses;
        }
    }
}