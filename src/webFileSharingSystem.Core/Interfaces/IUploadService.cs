﻿using System.IO;
using System.Threading;
using System.Threading.Tasks;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface IUploadService
    {
        Task<(Result result, PartialFileInfo? partialFileInfo)> CreateNewFileAsync(int userId,
            int? parentId,
            string fileName,
            string? mimeType, long size);

        Result UploadFileChunk(int userId, int fileId, int chunkIndex, Stream chunkStream,
            CancellationToken cancellationToken = default);

        Task<Result> CompleteFileAsync(int userId, int fileId,
            CancellationToken cancellationToken = default);
    }
}