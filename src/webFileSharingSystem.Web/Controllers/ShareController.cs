using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Mvc;

using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Specifications;
using webFileSharingSystem.Web.Contracts.Requests;

namespace webFileSharingSystem.Web.Controllers
{
    public class ShareController : BaseController
    {

        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentUserService _currentUserService;

        public ShareController( IUnitOfWork unitOfWork, ICurrentUserService currentUserService )
        {
            _unitOfWork = unitOfWork;
            _currentUserService = currentUserService;
        }

        [HttpPost]
        [Route("{fileId:int}/Add")]
        public async Task<ActionResult> AddShareAsync(int fileId, [FromBody] AddFileShareRequest request, CancellationToken cancellationToken = default)
        {
            var userId = _currentUserService.UserId;

            if (userId == request.UserToShareWithId) return BadRequest("You can't share file with yourself");

                var fileToShare = await _unitOfWork.Repository<File>().FindByIdAsync(fileId, cancellationToken);
            if (fileToShare is null) return BadRequest("File doesn't exist or you do not have access");

            var userExists = (await _unitOfWork.Repository<ApplicationUser>().CountAsync(
                x => x.Id == request.UserToShareWithId,
                cancellationToken)) > 0;
            if (!userExists) return BadRequest("Share can't be added");

            var existingShare = (await _unitOfWork.Repository<Share>()
                .FindAsync(new GetShareByUserAndFileIdSpecs(request.UserToShareWithId, fileId), cancellationToken)).SingleOrDefault();
            
            if (existingShare is not null) return BadRequest("File is already shared with that user");
            

            _unitOfWork.Repository<Share>().Add(new Share
            {
                SharedByUserId = userId!.Value,
                SharedWithUserId = request.UserToShareWithId,
                FileId = fileId,
                AccessMode = request.AccessMode,
                AccessDuration = request.AccessDuration
            }); 
            
            if (await _unitOfWork.Complete(cancellationToken) > 0) return Ok();
            
            return BadRequest("Problem with deleting share");
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
    }
}