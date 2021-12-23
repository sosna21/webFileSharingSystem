using System;
using HawkNet;
using Microsoft.Extensions.Options;
using webFileSharingSystem.Core.Interfaces;
using webFileSharingSystem.Core.Options;

namespace webFileSharingSystem.Infrastructure.HawkAuth
{
    public class HawkAuthService : IHawkAuthService
    {
        private readonly HawkSettings _hawkSettings;
        private readonly HawkCredential _hawkCredential;

        public HawkAuthService(IOptions<HawkSettings> hawkSettings, HawkCredential hawkCredential)
        {
            _hawkSettings = hawkSettings.Value;
            _hawkCredential = hawkCredential;
        }

        public string GenerateBewit(string host, string url, int userId)
        {
            return Hawk.GetBewit(host, new Uri(url), _hawkCredential, _hawkSettings.ExpiryTimeInSeconds, userId.ToString());
        }
    }
}