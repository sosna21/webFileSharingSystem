using System.IO;

namespace webFileSharingSystem.Core.Entities.Common
{
    public class DownloadedFile
    {
        public DownloadedFile(Stream fileStream, string fileName, string contentType)
        {
            FileStream = fileStream;
            FileName = fileName;
            ContentType = contentType;
        }

        public Stream FileStream { get; }
        public string FileName { get; }
        public string ContentType { get; }
    }
}
