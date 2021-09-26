using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Specifications;
using webFileSharingSystem.Core.Storage;
using webFileSharingSystem.Web.Contracts.Requests;
using File = webFileSharingSystem.Core.Entities.File;

namespace webFileSharingSystem.Web.Controllers
{
    public class UploadController : BaseController
    {
        private const string ErrorMessage = "File does not exist or you do not have access";
        private readonly IUnitOfWork _unitOfWork;
        private readonly ICurrentUserService _currentUserService;
        private readonly IFilePersistenceService _filePersistenceService;
        private static readonly object Locker = new();


        public UploadController(IUnitOfWork unitOfWork, ICurrentUserService currentUserService,
            IFilePersistenceService filePersistenceService)
        {
            _unitOfWork = unitOfWork;
            _currentUserService = currentUserService;
            _filePersistenceService = filePersistenceService;
        }


        [HttpPost]
        [Route("Start")]
        public async Task<ActionResult<PartialFileInfo>> StartFileUploadAsync([FromBody] UploadFileInfoRequest request)
        {
            var userId = _currentUserService.UserId;

            var fileWithPartialFileInfo = new File
            {
                UserId = userId!.Value,
                FileName = request.FileName,
                MimeType = request.MimeType,
                Size = (ulong) request.Size,
                FileStatus = FileStatus.Incomplete,
                FileId = Guid.NewGuid(),
                PartialFileInfo = StorageExtensions.GeneratePartialFileInfo(request.Size)
            };

            _unitOfWork.Repository<File>().Add(fileWithPartialFileInfo);

            if (await _unitOfWork.Complete() <= 0) return BadRequest("Problem during upload initialization");

            _filePersistenceService.GenerateAndCacheFilePath(
                userId.Value,
                fileWithPartialFileInfo.Id,
                fileWithPartialFileInfo.FileId!.Value);
            return fileWithPartialFileInfo.PartialFileInfo;
        }

        [HttpPut]
        [Route("{fileId:int}/Chunk/{chunkIndex:int}")]
        public async Task<ActionResult<PartialFileInfo>> UploadFileChunkAsync(int fileId, int chunkIndex,
            [FromForm] IFormFile chunk)
        {
            var userId = _currentUserService.UserId;

            var file = await _unitOfWork.Repository<File>().FindByIdAsync(fileId);

            if (file is null || file.UserId != userId) return Unauthorized(ErrorMessage);

            if (file.IsDirectory) return BadRequest("Directory can't be uploaded");

            if (file.FileStatus == FileStatus.Completed) return BadRequest("File is already fully uploaded");

            if (file.IsDeleted) return BadRequest("Can't upload to deleted file");

            PartialFileInfo partialFileInfo;

            lock (Locker)
            {
                partialFileInfo = _unitOfWork.Repository<PartialFileInfo>()
                    .FindAsync(new FindPartialFileInfoByFileIdSpecs(file.Id)).ConfigureAwait(false).GetAwaiter()
                    .GetResult().SingleOrDefault() ?? throw new InvalidOperationException("PartialFileInfo not found");

                partialFileInfo.PersistenceMap.SetBit(chunkIndex, false);

                _unitOfWork.Repository<PartialFileInfo>().Update(partialFileInfo);

                _unitOfWork.Complete().ConfigureAwait(false).GetAwaiter().GetResult();
            }


            var filePath = _filePersistenceService.GetCachedFilePath(fileId) ??
                           _filePersistenceService.GenerateAndCacheFilePath(userId.Value, fileId, file.FileId!.Value);

            var chunkSize = chunkIndex == partialFileInfo.NumberOfChunks - 1
                ? partialFileInfo.LastChunkSize
                : partialFileInfo.ChunkSize;

            //TODO use stream directly 'chunk.OpenReadStream()' instead of copping to memory stream
            var memoryStream = new MemoryStream();
            await chunk.CopyToAsync(memoryStream);

            await _filePersistenceService.SaveChunk(filePath, chunkIndex, chunkSize, memoryStream.ToArray());

            return Ok();
        }

        [HttpPut]
        [Route("{fileId:int}/Complete")]
        public async Task<ActionResult<PartialFileInfo>> CompleteFileUploadAsync(int fileId)
        {
            var userId = _currentUserService.UserId;

            var file = await _unitOfWork.Repository<File>().FindByIdAsync(fileId);

            if (file is null || file.UserId != userId) return Unauthorized(ErrorMessage);

            if (file.IsDirectory) return BadRequest("Directory can't be completed");

            if (file.FileStatus == FileStatus.Completed) return BadRequest("File is already completed");

            if (file.IsDeleted) return BadRequest("Deleted files can't be completed");

            var partialFileInfo = (await _unitOfWork.Repository<PartialFileInfo>()
                .FindAsync(new FindPartialFileInfoByFileIdSpecs(file.Id))).SingleOrDefault();

            if (partialFileInfo is null) throw new InvalidOperationException("PartialFileInfo not found");

            if (!partialFileInfo.PersistenceMap.CheckIfAllBitsAreZeros())
                return BadRequest("Not all chunks were uploaded correctly to the server");

            file.FileStatus = FileStatus.Completed;
            await _unitOfWork.Complete();
            return Ok();
        }
    }
}