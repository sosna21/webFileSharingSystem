using System;

using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Web.Contracts.Requests
{
    public class AddFileShareRequest
    {
        public int UserToShareWithId { get; set; }
        public ShareAccessMode AccessMode { get; set; }
        public TimeSpan AccessDuration { get; set; }
    }
}