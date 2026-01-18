using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Infrastructure.Identity;
using EntityState = Microsoft.EntityFrameworkCore.EntityState;

namespace webFileSharingSystem.Infrastructure.Data
{
    public class ApplicationDbContext : IdentityDbContext, IApplicationDbContext
    {
        private readonly ICurrentUserService _currentUserService;
        private readonly IDomainEventService _domainEventService;

        public ApplicationDbContext(DbContextOptions options, ICurrentUserService currentUserService)
            : base(options)
        {
            _currentUserService = currentUserService;
            //_domainEventService = domainEventService;
        }

        public DbSet<ApplicationUser> ApplicationUsers { get; set; }

        public DbSet<PartialFileInfo> PartialFileInfos { get; set; }


        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = new())
        {
            // TODO Inject CurrentUserService
            foreach (var entry in ChangeTracker.Entries<AuditableEntity>())
            {
                switch (entry.State)
                {
                    case EntityState.Added:
                        entry.Entity.CreatedBy = _currentUserService.UserId ?? -1;
                        entry.Entity.Created = DateTime.UtcNow;
                        break;

                    case EntityState.Modified:
                        entry.Entity.LastModifiedBy = _currentUserService.UserId ?? -1;
                        entry.Entity.LastModified = DateTime.UtcNow;
                        break;
                }
            }

            var result = await base.SaveChangesAsync(cancellationToken);

            //TODO Domain Events
            //await DispatchEvents();

            return result;
        }


        protected override void OnModelCreating(ModelBuilder builder)
        {
            builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

            base.OnModelCreating(builder);

            //Todo most likely some of the ef migration files are slightly broken that's why the 'FilePathPart' entity don't need the view
            builder.Entity<FilePathPart>().HasNoKey();//.ToView(null);
            builder.Entity<FileAccessMode>().HasNoKey();//.ToView(null);
            //builder.Entity<SharedFile>().HasNoKey();//.ToView(null);
            builder.Entity<SharedFileSqlRow>().HasNoKey();//.ToView(null);

            builder.Entity<RefreshToken>()
                .HasOne<IdentityUser>()
                .WithMany()
                .HasForeignKey(e => e.IdentityUserId);
            
            builder.Entity<RefreshToken>()
                .HasIndex( t => t.Token )
                .IsUnique();

            builder.Entity<RefreshToken>()
                .HasIndex( t => t.ReplacedByToken )
                .IsUnique();
            
            builder.Entity<ApplicationUser>()
                .HasOne<IdentityUser>()
                .WithOne()
                .HasForeignKey<ApplicationUser>(e => e.IdentityUserId);

            builder.Entity<File>()
                .HasOne<ApplicationUser>()
                .WithMany(e => e.Files)
                .HasForeignKey(e => e.UserId);

            builder.Entity<File>()
                .HasOne<File>()
                .WithMany()
                .HasForeignKey(e => e.ParentId);

            builder.Entity<File>().HasIndex(t => t.FileGuid);

            builder.Entity<PartialFileInfo>()
                .HasOne<File>()
                .WithOne(e => e.PartialFileInfo)
                .HasForeignKey<PartialFileInfo>(e => e.FileId);

            builder.Entity<Share>().HasOne<ApplicationUser>()
                .WithMany(e => e.Shares)
                .HasForeignKey(e => e.SharedByUserId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<Share>().HasOne<ApplicationUser>()
                .WithMany(e => e.Shares)
                .HasForeignKey(e => e.SharedWithUserId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<Share>()
                .HasOne(e => e.File);
            
            builder.Entity<Share>()
                .HasIndex(s => new { s.FileId, s.SharedWithUserId })
                .HasFilter("[RevokedAt] IS NULL")
                .IsUnique();
            
            builder.Entity<Share>()
                .HasIndex(s => s.SharedWithUserId)
                .HasFilter("[RevokedAt] IS NULL");
        }

        //TODO Add dispatch events if needed or remove 
        private async Task DispatchEvents()
        {
            while (true)
            {
                var domainEventEntity = ChangeTracker
                    .Entries<IHasDomainEvent>()
                    .Select(x => x.Entity.DomainEvents)
                    .SelectMany(x => x)
                    .FirstOrDefault(domainEvent => !domainEvent.IsPublished);

                if (domainEventEntity is null) break;

                domainEventEntity.IsPublished = true;
                await _domainEventService.Publish(domainEventEntity);
            }
        }
        
        public IQueryable<RefreshToken> GetListOfAllDescendantActiveRefreshTokens(string refreshToken) =>
            Set<RefreshToken>().FromSqlInterpolated(
                $@"
                    WITH recursive_cte AS
                    (
                        SELECT *
                        FROM [RefreshToken] WHERE [Token] = {refreshToken}
                        UNION All
                        SELECT [t].*
                        FROM [RefreshToken] AS [t]
                        INNER JOIN recursive_cte AS [cte] ON [t].[Token] = [cte].[ReplacedByToken] 
                    )
                    SELECT * FROM recursive_cte WHERE [Revoked] IS NULL
                ");

        public IQueryable<File> GetListOfAllParentsAsFiles(int parentId) =>
            Set<File>().FromSqlInterpolated(
                $@"
                    WITH recursive_cte AS
                    (
                        SELECT *
                        FROM [File] WHERE Id={parentId}
                        UNION ALL
                        SELECT [f].*
                        FROM [File] AS [f]
                        INNER JOIN recursive_cte AS [cte] ON [cte].[ParentId] = [f].[Id] 
                    )
                    SELECT * FROM recursive_cte
                ");

        public IQueryable<FilePathPart> GetFilePathParts(int id) =>
            Set<FilePathPart>().FromSqlInterpolated(
                $@"
                    WITH PathCTE AS
                    (
                        SELECT
                            f.Id,
                            f.FileName,
                            f.ParentId,
                            0 AS Depth
                        FROM [File] f
                        WHERE f.Id = {id}

                        UNION ALL

                        SELECT
                            p.Id,
                            p.FileName,
                            p.ParentId,
                            c.Depth + 1
                        FROM [File] p
                        INNER JOIN PathCTE c ON c.ParentId = p.Id
                    ),
                    MaxDepth AS
                    (
                        SELECT MAX(Depth) AS MaxDepth
                        FROM PathCTE
                    )
                    SELECT
                        p.Id,
                        p.FileName,
                        (md.MaxDepth - p.Depth) + 1 AS [Level],
                        NULL AS AccessMode,
                        NULL AS ValidUntil
                    FROM PathCTE p
                             CROSS JOIN MaxDepth md
                    ORDER BY p.Depth DESC;
                ");        
        
        public IQueryable<FilePathPart> GetSharedFilePathParts(int userId, int fileId) =>
            Set<FilePathPart>().FromSqlInterpolated(
                $@"
                    WITH PathCTE AS
                    (
                         SELECT
                             f.Id,
                             f.FileName,
                             f.ParentId,
                             0 AS Depth
                         FROM [File] f
                         WHERE f.Id = {fileId}

                         UNION ALL

                         SELECT
                             p.Id,
                             p.FileName,
                             p.ParentId,
                             c.Depth + 1
                         FROM [File] p
                                  INNER JOIN PathCTE c ON c.ParentId = p.Id
                        ),
                        PathWithShares AS
                             (
                                 SELECT
                                     p.Id,
                                     p.FileName,
                                     p.ParentId,
                                     p.Depth,
                                     s.Id AS ShareId,
                                     s.AccessMode,
                                     s.ValidUntil
                                 FROM PathCTE p
                                          LEFT JOIN [Share] s
                                                    ON s.FileId = p.Id
                                                        AND s.SharedWithUserId = {userId}
                                                        AND (s.ValidUntil IS NULL OR s.ValidUntil > SYSUTCDATETIME())
                                                        AND s.RevokedAt IS NULL
                             ),
                         ShareRoot AS
                             (
                                 -- FARTHEST explicit share (breadcrumb root)
                                 SELECT TOP 1 *
                                 FROM PathWithShares
                                 WHERE ShareId IS NOT NULL
                                 ORDER BY Depth DESC
                             ),
                         MaxDepth AS
                             (
                                 SELECT MAX(Depth) AS MaxDepth
                                 FROM PathCTE
                             )
                    SELECT
                        p.Id,
                        p.FileName,
                        (md.MaxDepth - p.Depth) + 1 AS [Level],
                        eff.AccessMode,
                        eff.ValidUntil
                    FROM PathWithShares p
                             CROSS APPLY
                         (
                             -- nearest explicit share ABOVE or AT this node
                             SELECT TOP 1
                                 s.AccessMode,
                                 s.ValidUntil
                             FROM PathWithShares s
                             WHERE
                                 s.ShareId IS NOT NULL
                               AND s.Depth >= p.Depth
                             ORDER BY s.Depth
                         ) eff
                             CROSS JOIN MaxDepth md
                    WHERE
                        p.Depth <= (SELECT Depth FROM ShareRoot)
                    ORDER BY p.Depth DESC;

                ");
        
        public IQueryable<FileAccessMode> GetSharedFileAccessMode(int fileId, int userId) =>
            Set<FileAccessMode>().FromSqlInterpolated(
                $@"
                   WITH recursive_cte AS
                    (
                        SELECT [Id], [ParentId], 0 AS [level]
                        FROM [File] WHERE Id = {fileId}
                        UNION ALL
                        SELECT [F].[Id], [F].[ParentId], [cte].[level] + 1
                        FROM [File] AS [F]
                        INNER JOIN recursive_cte AS [cte] ON [cte].[ParentId] = [F].[Id] 
                    )
                    SELECT TOP(1) [S].[Id], [S].[AccessMode] FROM recursive_cte AS [cte]
					INNER JOIN [Share] AS [S]
					ON [S].[FileId] = [cte].[Id]
					WHERE ([S].[ValidUntil] > SYSUTCDATETIME() or [S].[ValidUntil] is null) AND [S].[SharedWithUserId] = {userId}
					ORDER BY [cte].[level]
                ");


        public IQueryable<File> GetListOfAllChildrenAsFiles(int parentId) =>
            Set<File>().FromSqlInterpolated(
                $@"
                    WITH recursive_cte AS
                    (
                        SELECT *
                        FROM [File] WHERE Id={parentId}
                        UNION All
                        SELECT [f].*
                        FROM [File] AS [f]
                        INNER JOIN recursive_cte AS [cte] ON [f].[ParentId] = [cte].[Id] 
                    )
                    SELECT * FROM recursive_cte
                ");

        public IQueryable<File> GetListOfAllChildrenByParentTvfAsFiles(int parentId) =>
            Set<File>().FromSqlInterpolated(
                $@"
                    SELECT * FROM GetListOfAllChildrenByParentTVF({parentId})
                ");
        
        public IQueryable<SharedFileSqlRow> GetListOfAllSharedFilesForUserTvf(int userId, int? parentId) =>
            Set<SharedFileSqlRow>().FromSqlInterpolated(
                $@"
                    SELECT * FROM GetListOfAllSharedFilesForUserTVF({userId},{parentId})
                ");
        
        public IQueryable<File> GetListOfFilesSharedByUserId(int userId) =>
            Set<File>().FromSqlInterpolated(
                $@"
                      SELECT * FROM GetListOfFilesSharedByUserIdTVF({userId})
                ");

        public IQueryable<File> GetListOfAllFilesFromLocations(IList<int> fileIds)
        {
            var placeholders = string.Join(",", Enumerable.Range(0, fileIds.Count)
                .Select(i => "{" + i + "}"));
            var values = fileIds.Cast<object>().ToArray();

            var query = Set<File>().FromSqlRaw($@"    
                    WITH recursive_cte AS
                    (
                        SELECT *
                        FROM [File] WHERE Id IN ({placeholders})
                        UNION All
                        SELECT [f].*
                        FROM [File] AS [f]
                        INNER JOIN recursive_cte AS [cte] ON [f].[ParentId] = [cte].[Id] 
                    )
                    SELECT * FROM recursive_cte", values);
            return query;
        }
    }
}