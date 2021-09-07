using System.Threading;
using System.Threading.Tasks;

using webFileSharingSystem.Core.Entities;
using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface IUserService
    {
        
        Task<string> GetUserNameAsync(int userId, CancellationToken cancellationToken = default);

        Task<bool> IsInRoleAsync(int userId, string role, CancellationToken cancellationToken = default);

        Task<bool> AuthorizeAsync(int userId, string policyName, CancellationToken cancellationToken = default);

        Task<(Result Result, int UserId)> CreateUserAsync(string userName, string emailAddress, string password);

        Task<Result> DeleteUserAsync(int userId);
        
        Task<Result> DeleteUserAsync(ApplicationUser appUser);
    }
}