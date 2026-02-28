using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Infrastructure.Data;

namespace webFileSharingSystem.Infrastructure.Common
{
    public class CustomQueriesRepository : ICustomQueriesRepository
    {
        private readonly ApplicationDbContext _dbContext;

        public CustomQueriesRepository(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IEnumerable<FilePathPart>> FindPathToAllParentsForUserFile(int fileId, CancellationToken cancellationToken = default)
        {
            return await _dbContext.GetFilePathParts(fileId).ToListAsync(cancellationToken);
        }

        public async Task<IEnumerable<FilePathPart>> FindPathToAllParentForSharedFile(int userId, int fileId,
            CancellationToken cancellationToken = default)
        {
            return await _dbContext.GetSharedFilePathParts(userId, fileId).ToListAsync(cancellationToken);
        }
        
        public async Task<FileAccessMode?> GetSharedFileAccessMode(int fileId, int userId, CancellationToken cancellationToken = default) 
        {
            return (await _dbContext.GetSharedFileAccessMode(fileId, userId).ToListAsync(cancellationToken)).FirstOrDefault();
        }

        public async Task<List<File>> GetListOfAllChildrenAsFiles(int parentId, CancellationToken cancellationToken = default)
        {
            return await _dbContext.GetListOfAllChildrenAsFiles(parentId).ToListAsync(cancellationToken);
        }
        
        public async Task<List<File>> GetListOfAllParentsAsFiles(int parentId, CancellationToken cancellationToken = default)
        {
            return await _dbContext.GetListOfAllParentsAsFiles(parentId).ToListAsync(cancellationToken);
        }
        
        public async Task<List<File>> GetListOfAllFilesFromLocations(IList<int> fileIds, CancellationToken cancellationToken = default)
        {
            return await _dbContext.GetListOfAllFilesFromLocations(fileIds).ToListAsync(cancellationToken);
        }

        public IQueryable<File> GetFilteredListOfAllChildrenAsFilesQuery(int parentId, ISpecification<File> spec)
        {
            return SpecificationEvaluator<File, File>.GetQuery(_dbContext.GetListOfAllChildrenByParentTvfAsFiles(parentId), spec);
        }
        
        public IQueryable<File> GetListOfFilesSharedByUserIdQuery(int userId, ISpecification<File> spec)
        {
            return SpecificationEvaluator<File, File>.GetQuery(_dbContext.GetListOfFilesSharedByUserId(userId), spec);
        }
        
        public IQueryable<SharedFileSqlRow> GetListOfSharedFilesQuery(int userId, int? parentId, ISpecification<SharedFileSqlRow> spec)
        {
            return SpecificationEvaluator<SharedFileSqlRow, SharedFileSqlRow>.GetQuery(_dbContext.GetListOfAllSharedFilesForUserTvf(userId, parentId), spec);
        }

        public IQueryable<SharedFileSqlRow> GetListOfSharedFilesSubtreeQuery(int userId, int? parentId, ISpecification<SharedFileSqlRow> spec)
        {
            return SpecificationEvaluator<SharedFileSqlRow, SharedFileSqlRow>.GetQuery(_dbContext.GetListOfSharedFilesSubtreeForUserTvf(userId, parentId), spec);
        }

        public async Task<SharedFileSqlRow?> GetSharedFileById(int userId, int fileId, CancellationToken cancellationToken = default)
        {
            return (await _dbContext.GetSharedFileById(fileId, userId).ToListAsync(cancellationToken)).FirstOrDefault();
        }
    }
}