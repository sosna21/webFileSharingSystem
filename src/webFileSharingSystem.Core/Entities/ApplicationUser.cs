using System.Collections.Generic;
using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Core.Entities
{
    public class ApplicationUser : BaseEntity
    {
        public ApplicationUser( string userName, string? emailAddress, string identityUserId, ulong quota = 0 ) {
            UserName = userName;
            EmailAddress = emailAddress;
            IdentityUserId = identityUserId;
            Quota = quota;
        }

        
        // TODO: Consider not to duplicate identity UserName and EmailAddress
        public string? UserName { get; set; }
        
        public string? EmailAddress { get; set; }
        
        public ulong UsedSpace { get; set; }
        
        public ulong Quota { get; set; }
        
        public bool IsBlocked { get; set; }
        
        public string IdentityUserId { get; set; }
        
        public ICollection<File> Files { get; set; }
        
        public ICollection<Share> Shares { get; set; }
    }
}