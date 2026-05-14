using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Services;

namespace webFileSharingSystem.UnitTests.Helpers
{
    internal sealed class FakeUnitOfWork : IUnitOfWork
    {
        private readonly Dictionary<Type, object> _repositories = new();
        private readonly FakeCustomQueriesRepository _customQueriesRepository;

        public FakeUnitOfWork()
        {
            var fileRepo = new FakeRepository<File>();
            _repositories[typeof(File)] = fileRepo;
            _customQueriesRepository = new FakeCustomQueriesRepository(fileRepo);
        }

        public ICustomQueriesRepository CustomQueriesRepository() => _customQueriesRepository;

        public IRepository<TEntity> Repository<TEntity>() where TEntity : BaseEntity
        {
            if (_repositories.TryGetValue(typeof(TEntity), out var repo))
                return (IRepository<TEntity>)repo;

            var created = new FakeRepository<TEntity>();
            _repositories[typeof(TEntity)] = created;
            return created;
        }

        public Task<int> Complete(CancellationToken cancellationToken = default) => Task.FromResult(1);

        public FakeRepository<TEntity> GetRepository<TEntity>() where TEntity : BaseEntity
        {
            return (FakeRepository<TEntity>)Repository<TEntity>();
        }
    }

    internal sealed class FakeRepository<TEntity> : IRepository<TEntity> where TEntity : BaseEntity
    {
        private readonly List<TEntity> _items = new();
        private int _nextId = 1;

        public IReadOnlyList<TEntity> Items => _items;

        public Task<TEntity?> FindByIdAsync(int id, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_items.SingleOrDefault(e => e.Id == id));
        }

        public Task<IEnumerable<TEntity>> FindAsync(ISpecification<TEntity>? specification = null, CancellationToken cancellationToken = default)
        {
            var results = ApplySpecification(specification);
            return Task.FromResult(results.AsEnumerable());
        }

        public Task<IEnumerable<TResult>> FindAsync<TResult>(ISpecification<TEntity, TResult> specification, CancellationToken cancellationToken = default)
        {
            var query = ApplySpecification(specification);
            if (specification.Selector is not null)
            {
                var selector = specification.Selector.Compile();
                return Task.FromResult(query.Select(selector));
            }

            return Task.FromResult(query.Cast<TResult>());
        }

        public Task<PaginatedList<TResult>> PaginatedListFindAsync<TResult>(int pageNumber, int pageSize, Func<TEntity, TResult> mapToResult, ISpecification<TEntity>? specification = null, CancellationToken cancellationToken = default)
        {
            var query = ApplySpecification(specification);
            var items = query.Skip((pageNumber - 1) * pageSize).Take(pageSize).Select(mapToResult).ToList();
            return Task.FromResult(new PaginatedList<TResult>(items, query.Count(), pageNumber, pageSize));
        }

        public Task<PaginatedList<TResult>> PaginatedListFindAsync<TResult>(int pageNumber, int pageSize, Func<TEntity, TResult> mapToResult, IQueryable<TEntity> customQuery, CancellationToken cancellationToken = default)
        {
            var items = customQuery.Skip((pageNumber - 1) * pageSize).Take(pageSize).Select(mapToResult).ToList();
            return Task.FromResult(new PaginatedList<TResult>(items, customQuery.Count(), pageNumber, pageSize));
        }

        public Task<PaginatedList<TResult>> PaginatedListFindAsync<TResult>(int pageNumber, int pageSize, ISpecification<TEntity, TResult> specification, CancellationToken cancellationToken = default)
        {
            var query = ApplySpecification(specification);
            IEnumerable<TResult> items;
            if (specification.Selector is not null)
            {
                items = query.Select(specification.Selector.Compile());
            }
            else
            {
                items = query.Cast<TResult>();
            }

            var pageItems = items.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();
            return Task.FromResult(new PaginatedList<TResult>(pageItems, query.Count(), pageNumber, pageSize));
        }

        public Task<PaginatedList<TOut>> PaginatedListFindAsync<TSpecResult, TOut>(int pageNumber, int pageSize, Func<TSpecResult, TOut> mapToResult, ISpecification<TEntity, TSpecResult> specification, CancellationToken cancellationToken = default)
        {
            var query = ApplySpecification(specification);
            IEnumerable<TSpecResult> items;
            if (specification.Selector is not null)
            {
                items = query.Select(specification.Selector.Compile());
            }
            else
            {
                items = query.Cast<TSpecResult>();
            }

            var pageItems = items.Skip((pageNumber - 1) * pageSize).Take(pageSize).Select(mapToResult).ToList();
            return Task.FromResult(new PaginatedList<TOut>(pageItems, query.Count(), pageNumber, pageSize));
        }

        public Task<bool> ContainsAsync(ISpecification<TEntity>? specification = null, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(ApplySpecification(specification).Any());
        }

        public Task<bool> ContainsAsync(System.Linq.Expressions.Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_items.AsQueryable().Any(predicate));
        }

        public Task<int> CountAsync(ISpecification<TEntity>? specification = null, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(ApplySpecification(specification).Count());
        }

        public Task<int> CountAsync(System.Linq.Expressions.Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_items.AsQueryable().Count(predicate));
        }

        public void Add(TEntity entity)
        {
            if (entity.Id == 0)
                SetEntityId(entity, _nextId++);

            _items.Add(entity);
        }

        public void AddRange(IEnumerable<TEntity> entities)
        {
            foreach (var entity in entities)
                Add(entity);
        }

        public void Update(TEntity entity)
        {
            if (_items.Contains(entity))
                return;

            var index = _items.FindIndex(e => e.Id == entity.Id);
            if (index >= 0)
                _items[index] = entity;
            else
                _items.Add(entity);
        }

        public void Remove(TEntity entity)
        {
            _items.Remove(entity);
        }

        public void RemoveRange(IEnumerable<TEntity> entities)
        {
            foreach (var entity in entities)
                _items.Remove(entity);
        }

        private IEnumerable<TEntity> ApplySpecification(ISpecification<TEntity>? specification)
        {
            return ApplySpecification<TEntity>(specification);
        }

        private IEnumerable<TEntity> ApplySpecification<TSpec>(ISpecification<TEntity, TSpec>? specification)
        {
            var query = _items.AsQueryable();
            if (specification?.Criteria is not null)
                query = query.Where(specification.Criteria);

            if (specification?.OrderBy is not null)
                query = query.OrderBy(specification.OrderBy);

            if (specification?.OrderByDescending is not null)
                query = query.OrderByDescending(specification.OrderByDescending);

            if (specification?.Skip is not null)
                query = query.Skip(specification.Skip.Value);

            if (specification?.Take is not null)
                query = query.Take(specification.Take.Value);

            if (specification?.IsDistinct == true)
                query = query.Distinct();

            return query.ToList();
        }

        private static void SetEntityId(BaseEntity entity, int id)
        {
            var idProperty = typeof(BaseEntity).GetProperty("Id", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            idProperty?.SetValue(entity, id);
        }
    }

    internal sealed class FakeCustomQueriesRepository : ICustomQueriesRepository
    {
        private readonly FakeRepository<File> _fileRepository;

        public FakeCustomQueriesRepository(FakeRepository<File> fileRepository)
        {
            _fileRepository = fileRepository;
        }

        public Task<IEnumerable<FilePathPart>> FindPathToAllParentsForUserFile(int fileId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IEnumerable<FilePathPart>>(Array.Empty<FilePathPart>());
        }

        public Task<IEnumerable<FilePathPart>> FindPathToAllParentForSharedFile(int userId, int fileId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IEnumerable<FilePathPart>>(Array.Empty<FilePathPart>());
        }

        public Task<List<File>> GetListOfAllChildrenAsFiles(int parentId, CancellationToken cancellationToken = default)
        {
            var items = _fileRepository.Items.ToList();
            var root = items.SingleOrDefault(f => f.Id == parentId);
            if (root is null)
                return Task.FromResult(new List<File>());

            var results = new List<File> { root };
            var queue = new Queue<File>(new[] { root });

            while (queue.Count > 0)
            {
                var current = queue.Dequeue();
                var children = items.Where(f => f.ParentId == current.Id).ToList();
                foreach (var child in children)
                {
                    results.Add(child);
                    queue.Enqueue(child);
                }
            }

            return Task.FromResult(results);
        }

        public Task<FileAccessMode?> GetSharedFileAccessMode(int fileId, int userId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<FileAccessMode?>(null);
        }

        public Task<List<File>> GetListOfAllParentsAsFiles(int parentId, CancellationToken cancellationToken = default)
        {
            var items = _fileRepository.Items.ToDictionary(f => f.Id, f => f);
            var results = new List<File>();
            var currentId = parentId;

            while (items.TryGetValue(currentId, out var current))
            {
                results.Add(current);
                if (!current.ParentId.HasValue)
                    break;
                currentId = current.ParentId.Value;
            }

            return Task.FromResult(results);
        }

        public Task<List<File>> GetListOfAllFilesFromLocations(IList<int> fileIds, CancellationToken cancellationToken = default)
        {
            var items = _fileRepository.Items.Where(f => fileIds.Contains(f.Id)).ToList();
            return Task.FromResult(items);
        }

        public IQueryable<File> GetFilteredListOfAllChildrenAsFilesQuery(int parentId, ISpecification<File> spec)
        {
            return _fileRepository.Items.AsQueryable();
        }

        public IQueryable<File> GetListOfFilesSharedByUserIdQuery(int userId, ISpecification<File> spec)
        {
            return _fileRepository.Items.AsQueryable();
        }

        public IQueryable<SharedFileSqlRow> GetListOfSharedFilesQuery(int userId, int? parentId, ISpecification<SharedFileSqlRow> spec)
        {
            return Array.Empty<SharedFileSqlRow>().AsQueryable();
        }

        public IQueryable<SharedFileSqlRow> GetListOfSharedFilesSubtreeQuery(int userId, int? parentId, ISpecification<SharedFileSqlRow> spec)
        {
            return Array.Empty<SharedFileSqlRow>().AsQueryable();
        }

        public Task<SharedFileSqlRow?> GetSharedFileById(int userId, int fileId, CancellationToken token = default)
        {
            return Task.FromResult<SharedFileSqlRow?>(null);
        }
    }

    internal sealed class AllowAllGuardService : IGuardService
    {
        public Task<bool> UserCanPerform<T>(int userId, T entity, ShareAccessMode minimumAccessMode, CancellationToken cancellationToken = default) where T : BaseEntity, IEntityWithUserId
        {
            return Task.FromResult(true);
        }
    }

    internal sealed class NoOpUserLocks : IUserLocks
    {
        public Task<IDisposable> AcquireAsync(int userId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IDisposable>(new DisposableAction(() => { }));
        }

        public Task RemoveStaleLocksAsync(TimeSpan maxIdle)
        {
            return Task.CompletedTask;
        }
    }

    internal sealed class NoOpFilePersistenceService : IFilePersistenceService
    {
        public Task SaveChunk(int userId, Guid fileGuid, int chunkIndex, int chunkSize, System.IO.Stream data, CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }

        public Task CommitSavedChunks(int userId, Guid fileGuid, IEnumerable<int> chunkIndexes, string? fileContentType, bool isFileCompleted, CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }

        public Task GetChunk(int userId, Guid fileGuid, int chunkSize, int chunkIndex, System.IO.Stream outputStream, CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }

        public Task<System.IO.Stream> GetFileStream(int userId, Guid fileGuid, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<System.IO.Stream>(new System.IO.MemoryStream());
        }

        public Task GenerateNewFile(int userId, Guid fileGuid)
        {
            return Task.CompletedTask;
        }

        public Task DeleteExistingFile(int userId, Guid fileGuid)
        {
            return Task.CompletedTask;
        }
    }

    internal sealed class NoOpUploadService : IUploadService
    {
        public Task<(Result result, FileOperationContext? operationContext)> CreateNewFileAsync(int userId, int? parentId, string fileName, string? mimeType, long size, CancellationToken cancellationToken)
        {
            return Task.FromResult<(Result result, FileOperationContext? operationContext)>((Result.Success(), null));
        }

        public Task<Result> UploadFileChunk(int userId, int fileId, int chunkIndex, System.IO.Stream chunkStream, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Result.Success());
        }

        public Task<(Result result, IEnumerable<int> missingChunkIndexes)> GetMissingFileChunks(int userId, int fileId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<(Result result, IEnumerable<int> missingChunkIndexes)>((Result.Success(), Array.Empty<int>()));
        }

        public Task<Result> CompleteFileAsync(int userId, int fileId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Result.Success());
        }

        public Task<Result> UpdatePartialFileInfoAsync(int userId, int fileId)
        {
            return Task.FromResult(Result.Success());
        }

        public void CancelFileUpload(int userId, int fileId)
        {
        }

        public PartialFileInfo? GetCachedPartialFileInfo(int userId, int fileId)
        {
            return null;
        }

        public Task<(Result result, File? file)> EnsureDirectoriesExist(int userId, int? parentId, IEnumerable<string> folders, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<(Result result, File? file)>((Result.Success(), null));
        }
    }

    internal sealed class DisposableAction : IDisposable
    {
        private readonly Action _dispose;

        public DisposableAction(Action dispose)
        {
            _dispose = dispose;
        }

        public void Dispose()
        {
            _dispose();
        }
    }
}
