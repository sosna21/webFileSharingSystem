using System.IO;

namespace webFileSharingSystem.Core.Entities
{
    public class ProfilePhotoContent
    {
        public Stream Content { get; set; } = null!;

        public string ContentType { get; set; } = null!;
    }
}
