namespace webFileSharingSystem.Web.Contracts.Requests
{
    public class EnsureDirectoryRequest
    {
        public int? ParentId { get; set; }

        public string[] Folders { get; set; } = null!;
    }
}