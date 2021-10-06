using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface ICustomQueriesRepository
    {
        Task<IEnumerable<FilePathPart>> FindPathToAllParents(int fileId, CancellationToken cancellationToken = default);

        Task<List<File>> GetListOfAllChildrenAsFiles(int parentId, CancellationToken cancellationToken = default);
    }
}