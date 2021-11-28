﻿using System;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Web.Contracts.Responses
{
    public class ShareResponse
    {
        public string SharedWithUserName { get; set; } = null!;
        public ShareAccessMode AccessMode { get; set; }
        public DateTime ValidUntil { get; set; }
    }
}