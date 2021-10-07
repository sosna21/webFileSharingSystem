﻿using System.Collections.Generic;
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
        
        public async Task<IEnumerable<FilePathPart>> FindPathToAllParents(int fileId, CancellationToken cancellationToken = default)
        {
            return await _dbContext.GetFiePathParts(fileId).ToListAsync(cancellationToken);
        }
        
        public async Task<List<File>> GetListOfAllChildrenAsFiles(int parentId, CancellationToken cancellationToken = default)
        {
            return await _dbContext.GetListOfAllChildrenAsFiles(parentId).ToListAsync(cancellationToken);
        }
    }
}