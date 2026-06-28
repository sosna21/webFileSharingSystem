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
            var directory = Path.GetDirectoryName(fileName)!;
            if (Directory.Exists(directory))
                Directory.Delete(directory, true);
            Directory.CreateDirectory(directory);
            
            using var fs = new FileStream(fileName, FileMode.Create, FileAccess.Write, FileShare.None);
            fs.SetLength((long)sizeInMb * 1024 * 1024);
        }
    }
}