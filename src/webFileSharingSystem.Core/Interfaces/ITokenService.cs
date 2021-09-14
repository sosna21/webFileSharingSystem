using System.Threading.Tasks;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface ITokenService
    {
        public Task<string> GenerateToken(ApplicationUser appUser);
    }
}