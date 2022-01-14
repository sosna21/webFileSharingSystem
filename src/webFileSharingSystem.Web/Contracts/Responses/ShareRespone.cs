using System;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Web.Contracts.Responses
{
    public class ShareResponse
    {
        public int ShareId { get; set; }
        public string SharedWithUserName { get; set; } = null!;
        public ShareAccessMode AccessMode { get; set; }
        public DateTime ValidUntil { get; set; }
    }
}