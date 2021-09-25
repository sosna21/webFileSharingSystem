using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace webFileSharingSystem.Infrastructure.Storage.OnPremise
{
    public class FilePersistenceService
    {
        public static async Task SaveChunk(string filePath, int chunkIndex, int chunkSize, byte[] data,
            CancellationToken cancellationToken = default)
        {
            await using var stream = new FileStream(filePath, FileMode.OpenOrCreate, FileAccess.Write,
                FileShare.ReadWrite,
                4096, FileOptions.Asynchronous);

            stream.Position = chunkIndex * chunkSize;

            await stream.WriteAsync(data, cancellationToken);
        }


        public static async Task<byte[]> GetChunk(string filePath, int chunkSize, int chunkIndex,
            CancellationToken cancellationToken = default)
        {
            await using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite,
                4096, FileOptions.Asynchronous);

            stream.Position = chunkIndex * chunkSize;

            if (stream.Position + chunkSize > stream.Length)
            {
                chunkSize = (int) (stream.Length - stream.Position);
            }

            var buffer = new byte[chunkSize];
            await stream.ReadAsync(buffer, cancellationToken);
            
            return buffer;
        }
    }
}