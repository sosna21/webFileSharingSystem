using System;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Web.Contracts.Responses
{
    public class SharedFileResponse: FileResponse
    {
        public string SharedUserName { get; set; } = null!;
        public ShareAccessMode AccessMode { get; set; }
        public DateTime ValidUntil { get; set; }
    }
}