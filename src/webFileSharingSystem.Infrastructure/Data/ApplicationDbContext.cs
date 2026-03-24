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
            
            builder.Entity<FilePathPart>().HasNoKey().ToView(null);
            builder.Entity<FileAccessMode>().HasNoKey().ToView(null);
            builder.Entity<SharedFile>().HasNoKey().ToView(null);
            builder.Entity<SharedFileSqlRow>().HasNoKey().ToView(null);

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

            builder.Entity<ApplicationUser>()
                .Property(e => e.PhotoMimeType)
                .HasMaxLength(128);

            builder.Entity<ApplicationUser>()
                .HasIndex(e => e.PhotoFileGuid);

            builder.Entity<ApplicationUser>()
                .HasIndex(e => e.PhotoAccessId)
                .HasFilter("[PhotoAccessId] IS NOT NULL")
                .IsUnique();
            
            builder.Entity<File>()
                .HasOne(f => f.User)
                .WithMany(u => u.Files)
                .HasForeignKey(f => f.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<File>()
                .HasOne(f => f.Creator)
                .WithMany()
                .HasForeignKey(f => f.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);
            
            builder.Entity<File>()
                .HasOne(f => f.Parent)
                .WithMany(f => f.Children)
                .HasForeignKey(f => f.ParentId);

            builder.Entity<File>()
                .HasIndex(f => f.FileGuid);

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
                $@"SELECT * FROM GetDescendantActiveRefreshTokens({refreshToken})");
        
        public IQueryable<File> GetListOfAllParentsAsFiles(int parentId) =>
            Set<File>().FromSqlInterpolated(
                $@"SELECT * FROM GetParentFiles({parentId})");


        public IQueryable<File> GetListOfAllChildrenAsFiles(int parentId) =>
            Set<File>().FromSqlInterpolated(
                $@"SELECT * FROM GetChildrenAsFiles({parentId})");
        
        public IQueryable<FileAccessMode> GetSharedFileAccessMode(int fileId, int userId) =>
            Set<FileAccessMode>().FromSqlInterpolated(
                $@"SELECT * FROM GetSharedFileAccessMode({userId}, {fileId})");
            
        public IQueryable<FilePathPart> GetFilePathParts(int id) =>
            Set<FilePathPart>().FromSqlInterpolated(
                $@"SELECT * FROM GetFilePathParts({id})");        
        
        public IQueryable<SharedFileSqlRow> GetSharedFileById(int fileId, int userId) =>
            Set<SharedFileSqlRow>().FromSqlInterpolated(
                $@"SELECT * FROM GetSharedFileTVF({userId},{fileId});");
        
        public IQueryable<FilePathPart> GetSharedFilePathParts(int userId, int fileId) =>
            Set<FilePathPart>().FromSqlInterpolated(
                $@"SELECT * FROM GetSharedFilePathParts({userId}, {fileId})");

        public IQueryable<File> GetListOfAllChildrenByParentTvfAsFiles(int parentId) =>
            Set<File>().FromSqlInterpolated(
                $@"SELECT * FROM GetListOfAllChildrenByParentTVF({parentId})");
        
        public IQueryable<SharedFileSqlRow> GetListOfAllSharedFilesForUserTvf(int userId, int? parentId) =>
            Set<SharedFileSqlRow>().FromSqlInterpolated(
                $@"SELECT * FROM GetListOfAllSharedFilesForUserTVF({userId},{parentId})");
        
        public IQueryable<SharedFileSqlRow> GetListOfSharedFilesSubtreeForUserTvf(int userId, int? parentId) =>
            Set<SharedFileSqlRow>().FromSqlInterpolated(
                $@"SELECT * FROM GetSharedFilesSubtreeForUserTVF({userId},{parentId})");
        
        public IQueryable<File> GetListOfFilesSharedByUserId(int userId) =>
            Set<File>().FromSqlInterpolated(
                $@"SELECT * FROM GetListOfFilesSharedByUserIdTVF({userId})");

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