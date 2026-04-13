using System;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class FindUserByPhotoAccessIdSpecs : BaseSpecification<ApplicationUser>
    {
        public FindUserByPhotoAccessIdSpecs(Guid photoAccessId) : base(user => user.PhotoAccessId == photoAccessId)
        {
        }
    }
}
