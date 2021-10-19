using System;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Web.Contracts.Responses
{
    public class ShareResponse
    {
        public string SharedWithUserName { get; set; }
        public ShareAccessMode AccessMode { get; set; }
        public DateTime ValidUntil { get; set; }
    }
}