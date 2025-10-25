using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Web.Contracts.Requests;
using webFileSharingSystem.Web.Contracts.Responses;

namespace webFileSharingSystem.Web.Controllers
{
    public class UploadController : BaseController
    {
        private readonly ICurrentUserService _currentUserService;
        private readonly IUploadService _uploadService;

        public UploadController(ICurrentUserService currentUserService, IUploadService uploadService)
        {
            _currentUserService = currentUserService;
            _uploadService = uploadService;
        }


        [HttpPost]
        [Route("Start")]
        public async Task<ActionResult<File>> StartFileUploadAsync([FromBody] UploadFileInfoRequest request)
        {
            var userId = _currentUserService.UserId;

            var (result, file) = await _uploadService.CreateNewFileAsync(userId!.Value, request.ParentId,
                request.FileName, request.MimeType,
                request.Size);
            if (!result.Succeeded) return BadRequest(result.Errors);
            
            var fileResponse = ToFileResponse(file!);
            return Ok(fileResponse);
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
        public async Task<ActionResult<int>> EnsureDirectory([FromBody] EnsureDirectoryRequest request)
        {
            var userId = _currentUserService.UserId;

            var (result, file) =
                await _uploadService.EnsureDirectoriesExist(userId!.Value, request.ParentId, request.Folders);
            if (!result.Succeeded) return BadRequest(result.Errors);

            var response = ToFileResponse(file!);
            return Ok(response);
        }
        
        private FileResponse ToFileResponse(File file)
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
                ModificationDate = DateTime.SpecifyKind(file.LastModified ?? file.Created, DateTimeKind.Utc),
                FileStatus = file.FileStatus,
                PartialFileInfo = file.PartialFileInfo,
                UploadProgress = 0
            };
        }
    }
}