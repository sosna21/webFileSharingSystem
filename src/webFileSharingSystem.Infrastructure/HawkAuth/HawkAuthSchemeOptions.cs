using System;
using System.Threading.Tasks;
using HawkNet;
using Microsoft.AspNetCore.Authentication;

namespace webFileSharingSystem.Infrastructure.HawkAuth
{
    public class HawkAuthSchemeOptions : AuthenticationSchemeOptions
    {
        public Func<string, Task<HawkCredential>> Credentials { get; set; }
    }
}