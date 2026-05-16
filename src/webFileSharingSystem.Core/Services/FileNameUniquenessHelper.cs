using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Specifications;
using File = webFileSharingSystem.Core.Entities.File;

namespace webFileSharingSystem.Core.Services
{
    internal static class FileNameUniquenessHelper
    {
        public static async Task<string> GetUniqueNameAsync(
            IUnitOfWork unitOfWork,
            int userId,
            int? parentId,
            string fileName,
            CancellationToken cancellationToken)
        {
            var nameExists = await unitOfWork.Repository<File>()
                .ContainsAsync(new GetFileByNameSpecs(userId, parentId, fileName), cancellationToken);

            if (!nameExists)
                return fileName;

            var existingNames = await GetExistingNamesAsync(unitOfWork, userId, parentId, cancellationToken);
            return GetUniqueName(existingNames, fileName);
        }

        public static async Task<HashSet<string>> GetExistingNamesAsync(
            IUnitOfWork unitOfWork,
            int userId,
            int? parentId,
            CancellationToken cancellationToken)
        {
            return (await unitOfWork.Repository<File>()
                    .FindAsync(new GetAllFileNamesSpecs(parentId), cancellationToken))
                .ToHashSet();
        }

        public static string GetUniqueName(HashSet<string> existingNames, string fileName)
        {
            if (existingNames.Add(fileName))
                return fileName;

            var baseName = Path.GetFileNameWithoutExtension(fileName);
            var extension = Path.GetExtension(fileName);
            var counter = 1;
            string candidate;
            do
            {
                candidate = $"{baseName} ({counter++}){extension}";
            } while (!existingNames.Add(candidate));

            return candidate;
        }

        public static string GetUniqueCopyName(HashSet<string> existingNames, string fileName)
        {
            if (existingNames.Add(fileName))
                return fileName;

            var baseName = Path.GetFileNameWithoutExtension(fileName);
            var extension = Path.GetExtension(fileName);
            var baseCopyName = $"{baseName} - Copy{extension}";

            if (existingNames.Add(baseCopyName))
                return baseCopyName;

            var counter = 2;
            string candidate;
            do
            {
                candidate = $"{baseName} - Copy({counter++}){extension}";
            } while (!existingNames.Add(candidate));

            return candidate;
        }
    }
}
