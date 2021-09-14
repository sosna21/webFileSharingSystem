using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using webFileSharingSystem.Core.Interfaces;

namespace webFileSharingSystem.Web.Services
{
    public class CurrentUserService : ICurrentUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CurrentUserService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public int? UserId
        {
            get
            {
                if (int.TryParse(_httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier),
                    out var userId))
                {
                    return userId;
                }

                return null;
            }
        }
    }
}