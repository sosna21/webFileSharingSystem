using System.Threading.Tasks;
using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface IDomainEventService 
    {
        Task Publish(DomainEvent domainEvent);
    }
}