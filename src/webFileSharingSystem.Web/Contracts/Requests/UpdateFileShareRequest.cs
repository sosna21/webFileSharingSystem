using System;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Web.Contracts.Requests;

public class UpdateFileShareRequest
{
    public ShareAccessMode AccessMode { get; set; }
    public DateTime? ShareValidTo { get; set; }
}