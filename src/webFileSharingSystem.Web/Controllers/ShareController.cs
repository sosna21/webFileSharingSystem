using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;
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
            
            var response = ToShareResponse(share!);
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
           
            var response = ToShareResponse(updatedShare);
            return Ok(response);
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
            var shareResponses = shares.Select(ToShareResponse).ToList(); 
            return shareResponses;
        }

        private static ShareResponse ToShareResponse(Share share)
        {
            return new ShareResponse
            {
                ShareId = share.Id,
                SharedWithUserName = share.SharedWithUser.UserName ?? share.SharedWithUser.EmailAddress ?? "Unknown user",
                AccessMode = share.AccessMode,
                ValidUntil = share.ValidUntil is not null ? DateTime.SpecifyKind(share.ValidUntil.Value, DateTimeKind.Utc) : null
            };
        }
    }
}