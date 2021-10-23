using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface ICustomQueriesRepository
    {
        Task<IEnumerable<FilePathPart>> FindPathToAllParents(int fileId, CancellationToken cancellationToken = default);

        Task<List<File>> GetListOfAllChildrenAsFiles(int parentId, CancellationToken cancellationToken = default);
        
        Task<List<File>> GetListOfAllParentsAsFiles(int parentId, CancellationToken cancellationToken = default);
        
        Task<List<File>> GetListOfAllFilesFromLocations(IList<int> fileIds, CancellationToken cancellationToken = default);

        IQueryable<File> GetFilteredListOfAllChildrenAsFilesQuery(int parentId, ISpecification<File> spec);
        
        
    }
}