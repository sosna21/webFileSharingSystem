using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Web.Contracts.Requests
{
    public class AddFileShareRequest
    {
        public string UserNameToShareWith { get; set; } = null!;
        public ShareAccessMode AccessMode { get; set; }
        public string? AccessDuration { get; set; }
        public bool? Update { get; set; }
    }
}