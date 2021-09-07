namespace webFileSharingSystem.Core.Entities.Common
{
    public abstract class BaseEntity
    {
        public int Id { get; protected set; }
        
        //Consider 
        // public bool MarkedForDeletion {get; protected set; }
        // public DateTime? MarkedForDeletionTimeStamp {get; protected set; }
    }
}