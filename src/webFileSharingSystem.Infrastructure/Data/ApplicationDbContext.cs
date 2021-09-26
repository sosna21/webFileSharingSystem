using System;
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
                .WithOne()
                .HasForeignKey<File>(e => e.ParentId);
            
            builder.Entity<PartialFileInfo>()
                .HasOne<File>()
                .WithOne(e => e.PartialFileInfo)
                .HasForeignKey<PartialFileInfo>(e => e.FileId);
            
        }

        private async Task DispatchEvents()
        {
            while (true)
            {
                var domainEventEntity = ChangeTracker
                    .Entries<IHasDomainEvent>()
                    .Select(x => x.Entity.DomainEvents)
                    .SelectMany(x => x)
                    .FirstOrDefault( domainEvent => !domainEvent.IsPublished );
                
                if (domainEventEntity is null) break;

                domainEventEntity.IsPublished = true;
                await _domainEventService.Publish(domainEventEntity);
            }
        }
    }
}