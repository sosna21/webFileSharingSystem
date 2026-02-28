using System;

namespace webFileSharingSystem.Core.Entities.Common;

public class FileOperationContext
{
    public bool IsOwnFile { get; init; }
    public File File { get; init; } = null!;

    // only if shared
    public ShareAccessMode? AccessMode { get; init; }
    public DateTime? ValidUntil { get; init; }
    public string? SharedUserName { get; init; }
    public bool? IsInherited { get; init; }
}