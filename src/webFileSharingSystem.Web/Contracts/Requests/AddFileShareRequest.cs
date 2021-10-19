using System;

using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Web.Contracts.Requests
{
    public class AddFileShareRequest
    {
        public string UserNameToShareWith { get; set; }
        public ShareAccessMode AccessMode { get; set; }
        public string AccessDuration { get; set; }
    }
}