using System;

namespace webFileSharingSystem.Core.Entities.Common
{
    public abstract class DomainEvent {
        protected DomainEvent()
        {
            DateOccurred = DateTimeOffset.UtcNow;
        }
        public bool IsPublished { get; set; }
        public DateTimeOffset DateOccurred { get; protected set; }
    }
}