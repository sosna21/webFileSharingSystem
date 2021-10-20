using System.IO;
using Xunit;

namespace webFileSharingSystem.UnitTests.Storage
{
    public class GenerateFile
    {
        [Theory]
        [InlineData(@"C:\temp\testFile",5)]
        public void Generate(string fileName, int sizeInMb)
        {
            using var fs = new FileStream(fileName, FileMode.Create, FileAccess.Write, FileShare.None);
            fs.SetLength((long)sizeInMb * 1024 * 1024);
        }
    }
}