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

        public ShareController(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
        {
            _unitOfWork = unitOfWork;
            _currentUserService = currentUserService;
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