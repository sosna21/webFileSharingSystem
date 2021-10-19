﻿using System;
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
using EntityState = Microsoft.EntityFrameworkCore.EntityState;

namespace webFileSharingSystem.Infrastructure.Data {
    
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

        public Microsoft.EntityFrameworkCore.DbSet<ApplicationUser> ApplicationUsers { get; set; }

        public Microsoft.EntityFrameworkCore.DbSet<PartialFileInfo> PartialFileInfos { get; set; }


        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = new())
        {
            // TODO Inject CurrentUserService
            foreach (var entry in ChangeTracker.Entries<AuditableEntity>())
            {
                switch (entry.State)
                {
                    case EntityState.Added:
                        entry.Entity.CreatedBy = _currentUserService.UserId ?? -1;
                        entry.Entity.Created = DateTime.Now;
                        break;

                    case EntityState.Modified:
                        entry.Entity.LastModifiedBy = _currentUserService.UserId ?? -1;
                        entry.Entity.LastModified = DateTime.Now;
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

            builder.Entity<PartialFileInfo>()
                .HasOne<File>()
                .WithOne(e => e.PartialFileInfo)
                .HasForeignKey<PartialFileInfo>(e => e.FileId);

            builder.Entity<FilePathPart>().HasNoKey().ToView(null);
            
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
                    WITH recursive_cte AS
                    (
                    SELECT [Id], [FileName], [ParentId]
                    FROM [File] WHERE Id={id}
                    UNION ALL
                    SELECT [f].[Id], [f].[FileName], [f].[ParentId]
                    FROM [File] AS [f]
                    INNER JOIN recursive_cte AS [cte] ON [cte].[ParentId] = [f].[Id] 
                    )
                    SELECT [Id], [FileName] FROM recursive_cte
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
    }
}