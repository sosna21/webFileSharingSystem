using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;
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
        private readonly IShareService _shareService;

        public ShareController(IUnitOfWork unitOfWork, ICurrentUserService currentUserService, IShareService shareService)
        {
            _unitOfWork = unitOfWork;
            _currentUserService = currentUserService;
            _shareService = shareService;
        }

        [HttpPost]
        [Route("{fileId:int}")]
        public async Task<ActionResult> AddShareAsync(int fileId, [FromBody] AddFileShareRequest request,
            CancellationToken cancellationToken = default)
        {
            var userId = _currentUserService.UserId;

            (Result<OperationResult> result, Share? share) = await _shareService.AddShareAsync(fileId, request.UserNameToShareWith,
                request.AccessMode, request.ShareValidTo, userId!.Value, cancellationToken);

            if (!result.Succeeded) return result.ToActionResult(result.Errors.Length > 0 ? result.Errors[0] : "Problem with adding share");
            var userName = (await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(share!.SharedWithUserId, cancellationToken))!.UserName;
            var response = ToShareResponse(share, userName!);
            return Ok(response);
        }

        [HttpPut]
        [Route("{shareId:int}")]
        public async Task<ActionResult> UpdateShareAsync(int shareId, [FromBody] UpdateFileShareRequest request,
            CancellationToken cancellationToken = default)
        {
            var userId = _currentUserService.UserId;
            (Result<OperationResult> result, Share? updatedShare) = await _shareService.UpdateShareAsync(shareId, request.AccessMode, request.ShareValidTo, userId!.Value, cancellationToken);
            if (!result.Succeeded) return result.ToActionResult(result.Errors.Length > 0 ? result.Errors[0] : "Problem with updating share");
            var userName = (await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(updatedShare!.SharedWithUserId, cancellationToken))!.UserName;
            var response = ToShareResponse(updatedShare, userName!);
            return Ok(response);
        }

        [HttpGet]
        [Route("GetNames/{parentId:int?}")]
        public async Task<IEnumerable<string>> GetAllSharedFilenamesInFolder(int parentId = -1)
        {
            var dbParentId = parentId == -1 ? (int?)null : parentId;
            var userId = _currentUserService.UserId;
            //TODO temporary solution - resolve in another way
            var sharedFiles = _unitOfWork.CustomQueriesRepository().GetListOfSharedFilesQuery(userId!.Value, dbParentId,
                new GetSharedFilesSpec<SharedFile>(dbParentId, ""));
            return await sharedFiles.Select(e => e.FileName).ToListAsync();
        }


        [HttpDelete]
        [Route("RemoveShare/{fileId:int}")]
        public async Task<ActionResult> RemoveShare(int fileId)
        {
            var userId = _currentUserService.UserId!.Value;
            var result = await _shareService.RemoveShareByFileIdAsync(fileId, userId);
            return result.ToActionResult("Problem with removing this share/s");
        }

        [HttpDelete]
        [Route("{shareId:int}")]
        public async Task<ActionResult> DeleteShare(int shareId)
        {
            var userId = _currentUserService.UserId;
            var result = await _shareService.DeleteShareAsync(shareId, userId!.Value);
            return result.ToActionResult("Problem with deleting the share");
        }

        [HttpGet]
        [Route("GetShares/{fileId:int}")]
        public async Task<IList<ShareResponse>> GetShares(int fileId)
        {
            var userId = _currentUserService.UserId;

            (_, IEnumerable<Share> shares) = await _shareService.GetSharesForFileAsync(fileId, userId!.Value);

            var shareResponses = new List<ShareResponse>();
            foreach (var share in shares)
            {
                var userName = (await _unitOfWork.Repository<ApplicationUser>().FindByIdAsync(share.SharedWithUserId))!.UserName;
                shareResponses.Add(ToShareResponse(share, userName!));
            }

            return shareResponses;
        }

        [HttpGet]
        [Route("GetSharedWithMe")]
        public async Task<PaginatedList<SharedFileResponse>> GetFilesSharedWithMe([FromQuery] FileRequest request)
        {
            var userId = _currentUserService.UserId;
            var sharedFiles =  await _unitOfWork.Repository<SharedFile>()
                .PaginatedListFindAsync(request.PageNumber, request.PageSize,
                    ToSharedFileResponse,
                    _unitOfWork.CustomQueriesRepository().GetListOfSharedFilesQuery(userId!.Value, request.ParentId,
                        new GetSharedFilesSpec<SharedFile>(request.ParentId, request.SearchedPhrase)));
            return sharedFiles;
        }

        private static SharedFileResponse ToSharedFileResponse(SharedFile sharedFile)
        {
            return new SharedFileResponse
            {
                Id = sharedFile.Id,
                UserId = sharedFile.UserId,
                FileName = sharedFile.FileName,
                MimeType = sharedFile.MimeType,
                Size = sharedFile.Size,
                IsDirectory = sharedFile.IsDirectory,
                ShareId = sharedFile.ShareId,
                SharedUserName = sharedFile.SharedUserName,
                AccessMode = sharedFile.AccessMode,
                ValidUntil = sharedFile.ValidUntil == DateTime.MaxValue 
                    ? null 
                    : DateTime.SpecifyKind(sharedFile.ValidUntil, DateTimeKind.Utc)
            };
        }

        private static ShareResponse ToShareResponse(Share share, string userName)
        {
            return new ShareResponse
            {
                ShareId = share.Id,
                SharedWithUserName = userName,
                AccessMode = share.AccessMode,
                ValidUntil = share.ValidUntil == DateTime.MaxValue 
                    ? null 
                    :  DateTime.SpecifyKind(share.ValidUntil, DateTimeKind.Utc)
            };
        }
    }
}