namespace webFileSharingSystem.Core.Entities.Common
{
    public enum AuthenticationResult
    {
        Success,
        Failed,
        LockedOut,
        IsBlocked,
        NotFound
    }
}