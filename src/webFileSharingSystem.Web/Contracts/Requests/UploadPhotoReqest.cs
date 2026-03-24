using Microsoft.AspNetCore.Http;

namespace webFileSharingSystem.Web.Contracts.Requests;

public class UploadPhotoReqest
{
    public IFormFile Photo { get; set; } = default!;
}