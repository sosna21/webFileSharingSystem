using System;
using System.Linq;
using System.Security;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using HawkNet;

namespace webFileSharingSystem.Infrastructure.HawkAuth
{
    public class HawkAuthHandler : AuthenticationHandler<HawkAuthSchemeOptions>
    {
        public HawkAuthHandler(IOptionsMonitor<HawkAuthSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder, ISystemClock clock) 
            : base(options, logger, encoder, clock)
        {
        }

        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            // Hawk authentication for HTTP GET methods using Bewit authentication token
            if (!Request.Method.Equals("GET", StringComparison.InvariantCultureIgnoreCase) 
                || !Request.Query.Any() 
                || !Request.Query.TryGetValue("bewit", out var bewit) ) 
                return AuthenticateResult.Fail("Bewit Not Found.");
            
            try
            {
                // authenticate using Hawk
                var principal = await Hawk.AuthenticateBewitAsync(
                    bewit.ToString(),
                    Request.Host.Value,
                    new Uri(CurrentUri),
                    Options.Credentials);

                var parts = Encoding.UTF8.GetString(Convert.FromBase64String(bewit)).Split('\\');

                if (parts.Length < 4)
                    return AuthenticateResult.Fail("Invalid Bewit.");

                // generate identity from hawk principal add user Id as a claim
                var identity = new ClaimsIdentity(principal.Identity, 
                    new []{ new Claim(ClaimTypes.NameIdentifier, parts[3]) });

                // generate AuthenticationTicket from the Principal
                // and current authentication scheme
                var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name);

                // pass on the ticket to the middleware
                return AuthenticateResult.Success(ticket);
            }
            catch (SecurityException)
            {
                return AuthenticateResult.Fail("Invalid Bewit.");
            }
            catch (Exception)
            {
                return AuthenticateResult.Fail("Authentication Exception");
            }
        }
    }
}