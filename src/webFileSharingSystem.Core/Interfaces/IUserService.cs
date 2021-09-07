using System.Threading.Tasks;

using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Core.Interfaces
{
    public interface IUserService
    {
        
        Task<string> GetUserNameAsync(int userId);

        Task<bool> IsInRoleAsync(int userId, string role);

        Task<bool> AuthorizeAsync(int userId, string policyName);

        Task<(Result Result, int UserId)> CreateUserAsync(string userName, string emailAddress, string password);

        Task<Result> DeleteUserAsync(int userId);
    }
}