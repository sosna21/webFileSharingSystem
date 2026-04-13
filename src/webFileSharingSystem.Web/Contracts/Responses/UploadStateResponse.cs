using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Web.Contracts.Responses;

public class UploadStateResponse
{
    public int FileId { get; set; }
    public byte[]? PersistenceMap { get; set; }
    public double? UploadProgress { get; set; }
    public FileStatus Status { get; set; }
}