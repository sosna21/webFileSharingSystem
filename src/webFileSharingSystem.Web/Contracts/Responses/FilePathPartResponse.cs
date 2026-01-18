
using System;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Web.Contracts.Responses
{
    public class FilePathPartResponse 
    {
        public int Id { get; set; }
        public string FileName { get; set; } = null!;
        public int Level { get; set; }
        public ShareAccessMode? AccessMode { get; init; }
        public DateTime? ValidUntil { get; init; }
    }
}