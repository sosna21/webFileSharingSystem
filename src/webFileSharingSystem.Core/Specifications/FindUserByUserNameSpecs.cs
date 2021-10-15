using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public class FindUserByUserNameSpecs : BaseSpecification<ApplicationUser>
    {
        public FindUserByUserNameSpecs(string userName)
            : base(user => user.UserName == userName || user.EmailAddress == userName)
        {
        }
    }
}