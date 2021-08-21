using System.Threading.Tasks;

namespace API.Identity {
    public interface IIdentityService {
        Task<string> GetUserNameAsync(string userId);

        Task<string> CreateUserAsync(string userName, string password);

        Task<bool> IsInRoleAsync(string userId, string role);

        Task<bool> AuthorizeAsync(string userId, string policyName);

        Task DeleteUserAsync(string userId);

        Task DeleteUserAsync( ApplicationUser user );
    }
}