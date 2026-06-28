using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
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
    public class UploadController : BaseController
    {
        private readonly ICurrentUserService _currentUserService;
        private readonly IUploadService _uploadService;
        private readonly IUnitOfWork _unitOfWork;

        public UploadController(ICurrentUserService currentUserService, IUploadService uploadService,
            IUnitOfWork unitOfWork)
        {
            _currentUserService = currentUserService;
            _uploadService = uploadService;
            _unitOfWork = unitOfWork;
        }


        [HttpPost]
        [Route("Start")]
        public async Task<ActionResult<File>> StartFileUploadAsync([FromBody] UploadFileInfoRequest request,
            CancellationToken cancellationToken = default)
        {
            var userId = _currentUserService.UserId;

            var (result, ctx) = await _uploadService.CreateNewFileAsync(userId!.Value, request.ParentId,
                request.FileName, request.MimeType, request.Size, cancellationToken);
            if (!result.Succeeded) return BadRequest(result.Errors);

            if (ctx!.IsOwnFile)
            {
                var fileResponse = ToFileResponse(ctx.File);
                return Ok(fileResponse);
            }

            var sharedFileResponse = ToSharedFileResponse(ctx);
            return Ok(sharedFileResponse);
        }

        [ApiExplorerSettings(IgnoreApi = true)]
        [HttpPut]
        [Route("{fileId:int}/Chunk/{chunkIndex:int}")]
        public async Task<ActionResult<PartialFileInfo>> UploadFileChunkAsync(int fileId, int chunkIndex,
            [FromForm] IFormFile chunk, CancellationToken cancellationToken = default)
        {
            var userId = _currentUserService.UserId;

            var result = await _uploadService.UploadFileChunk(userId!.Value, fileId, chunkIndex, chunk.OpenReadStream(),
                cancellationToken);

            if (!result.Succeeded) return BadRequest(result.Errors);

            return Ok();
        }


        [HttpPut]
        [Route("{fileId:int}/Pause")]
        public async Task<ActionResult<PartialFileInfo>> PauseFileUploadAsync(int fileId)
        {
            var userId = _currentUserService.UserId;

            var result = await _uploadService.UpdatePartialFileInfoAsync(userId!.Value, fileId);

            if (!result.Succeeded) return BadRequest(result.Errors);

            return Ok();
        }


        [HttpPut]
        [Route("{fileId:int}/Complete")]
        public async Task<ActionResult<PartialFileInfo>> CompleteFileUploadAsync(int fileId,
            CancellationToken cancellationToken = default)
        {
            var userId = _currentUserService.UserId;

            var result = await _uploadService.CompleteFileAsync(userId!.Value, fileId, cancellationToken);

            if (!result.Succeeded) return BadRequest(result.Errors);

            return Ok();
        }

        [HttpGet]
        [Route("{fileId:int}/MissingChunks")]
        public async Task<ActionResult<IEnumerable<int>>> GetMissingChunksAsync(int fileId,
            CancellationToken cancellationToken = default)
        {
            var userId = _currentUserService.UserId;
            var (result, missingChunkIndexes) =
                await _uploadService.GetMissingFileChunks(userId!.Value, fileId, cancellationToken);

            if (!result.Succeeded) return BadRequest(result.Errors);

            return Ok(missingChunkIndexes);
        }

        [HttpPost]
        [Route("EnsureDirectory")]
        public async Task<ActionResult<int>> EnsureDirectory([FromBody] EnsureDirectoryRequest request,
            CancellationToken cancellationToken = default)
        {
            var userId = _currentUserService.UserId;

            var (result, ctx) =
                await _uploadService.EnsureDirectoriesExist(userId!.Value, request.ParentId, request.Folders,
                    cancellationToken);
            if (!result.Succeeded) return BadRequest(result.Errors);

            if (ctx!.IsOwnFile)
            {
                var response = ToFileResponse(ctx.File);
                return Ok(response);
            }

            var sharedResponse = ToSharedFileResponse(ctx);
            return Ok(sharedResponse);
        }

        [HttpGet]
        [Route("Active")]
        public async Task<ActionResult<UploadStateResponse>> GetNonUserFilesStatus(int directoryId,
            CancellationToken cancellationToken = default)
        {
            var userId = _currentUserService.UserId;

            var files = await _unitOfWork.Repository<File>()
                .FindAsync(new GetActiveNonUserUploadsSpecs(userId!.Value, directoryId), cancellationToken);

            var response = files.Select(file =>
            {
                var partialFileInfo = _uploadService.GetCachedPartialFileInfo(file.CreatedBy, file.Id) ?? file.PartialFileInfo;
                return new UploadStateResponse()
                {
                    FileId = file.Id,
                    PersistenceMap = partialFileInfo?.PersistenceMap,
                    UploadProgress = CalculateUploadProgress(partialFileInfo),
                    Status = file.FileStatus
                };
            }).ToList();

            return Ok(response);
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
                PartialFileInfo = file.PartialFileInfo,
                UploadProgress = 0,
                CreatedBy = file.CreatedBy,
                CreatedByUserName = file.Creator.UserName ?? file.Creator.EmailAddress!,
                CreatedByPhotoUrl = GetPhotoUrl(file.Creator.PhotoAccessId)
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
                SharedUserPhotoUrl = GetPhotoUrl(ctx.SharedUserPhotoAccessId),
                AccessMode = ctx.AccessMode!.Value,
                ValidUntil = ctx.ValidUntil is not null
                    ? DateTime.SpecifyKind(ctx.ValidUntil.Value, DateTimeKind.Utc)
                    : null,
                CreatedBy = file.CreatedBy,
                CreatedByUserName = file.Creator.UserName ?? file.Creator.EmailAddress!,
                CreatedByPhotoUrl = GetPhotoUrl(file.Creator.PhotoAccessId),
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