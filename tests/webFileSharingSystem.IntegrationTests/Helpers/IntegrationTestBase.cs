using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using webFileSharingSystem.Core.Options;
using webFileSharingSystem.Infrastructure.Data;
using webFileSharingSystem.Web.Contracts.Requests;
using webFileSharingSystem.Web.Contracts.Responses;
using Xunit;

namespace webFileSharingSystem.IntegrationTests.Helpers
{
    [Collection("IntegrationTests")]
    public abstract class IntegrationTestBase(SqlServerContainerFixture dbFixture) : IAsyncLifetime
    {
        private IntegrationTestWebApplicationFactory? _factory;

        protected HttpClient Client { get; private set; } = null!;

        public async ValueTask InitializeAsync()
        {
            _factory = new IntegrationTestWebApplicationFactory(dbFixture);
            Client = _factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost"),
                AllowAutoRedirect = false
            });

            await dbFixture.EnsureRespawnerAsync();
            await dbFixture.ResetDatabaseAsync();
        }

        public ValueTask DisposeAsync()
        {
            Client.Dispose();
            _factory?.Dispose();
            return ValueTask.CompletedTask;
        }

        protected void SetBearerToken(string token)
        {
            Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        protected void ClearBearerToken()
        {
            Client.DefaultRequestHeaders.Authorization = null;
        }

        protected HttpClient CreateAnonymousClient()
        {
            if (_factory is null)
            {
                throw new InvalidOperationException("Test server not initialized.");
            }

            return _factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost"),
                AllowAutoRedirect = false
            });
        }

        protected async Task<string> RegisterAndLoginAsync(string userName, string password, string email, CancellationToken token = default)
        {
            var registerResponse = await Client.PostAsJsonAsync("/api/Auth/Register", new RegisterRequest
            {
                Username = userName,
                Password = password,
                Email = email
            }, token);
            registerResponse.EnsureSuccessStatusCode();

            var loginResponse = await Client.PostAsJsonAsync("/api/Auth/Login", new LoginRequest
            {
                Username = userName,
                Password = password
            }, token);
            loginResponse.EnsureSuccessStatusCode();

            var envelope = await loginResponse.Content.ReadFromJsonAsync<LoginResponseEnvelope>(cancellationToken: token);
            return envelope!.Tokens.Token;
        }

        protected async Task<FileResponse> StartUploadAsync(UploadFileInfoRequest request, CancellationToken token = default)
        {
            var response = await Client.PostAsJsonAsync("/api/Upload/Start", request, cancellationToken: token);
            response.EnsureSuccessStatusCode();

            var fileResponse = await response.Content.ReadFromJsonAsync<FileResponse>(cancellationToken: token);
            return fileResponse!;
        }

        protected async Task UploadSingleChunkAsync(int fileId, byte[] content, CancellationToken token = default)
        {
            using var form = new MultipartFormDataContent();
            using var chunkContent = new ByteArrayContent(content);
            form.Add(chunkContent, "chunk", "chunk.bin");

            var response = await Client.PutAsync($"/api/Upload/{fileId}/Chunk/0", form, token);
            response.EnsureSuccessStatusCode();
        }

        protected async Task CompleteUploadAsync(int fileId, CancellationToken token = default)
        {
            var response = await Client.PutAsync($"/api/Upload/{fileId}/Complete", content: null, cancellationToken: token);
            response.EnsureSuccessStatusCode();
        }

        protected async Task<FileResponse> CreateDirectoryAsync(string name, int? parentId = null, CancellationToken token = default)
        {
            var url = parentId.HasValue
                ? $"/api/File/CreateDir/{name}?parentId={parentId.Value}"
                : $"/api/File/CreateDir/{name}";

            var response = await Client.PostAsync(url, content: null, cancellationToken: token);
            response.EnsureSuccessStatusCode();

            var fileResponse = await response.Content.ReadFromJsonAsync<FileResponse>(cancellationToken: token);
            return fileResponse!;
        }

        protected async Task<ShareResponse> AddShareAsync(int fileId, AddFileShareRequest request, CancellationToken token = default)
        {
            var response = await Client.PostAsJsonAsync($"/api/Share/{fileId}", request, cancellationToken: token);
            response.EnsureSuccessStatusCode();

            var shareResponse = await response.Content.ReadFromJsonAsync<ShareResponse>(cancellationToken: token);
            return shareResponse!;
        }

        protected async Task UpdateShareAsync(int shareId, UpdateFileShareRequest request, CancellationToken token = default)
        {
            var response = await Client.PutAsJsonAsync($"/api/Share/{shareId}", request, cancellationToken: token);
            response.EnsureSuccessStatusCode();
        }

        protected async Task DeleteShareAsync(int shareId, CancellationToken token = default)
        {
            var response = await Client.DeleteAsync($"/api/Share/{shareId}", cancellationToken: token);
            response.EnsureSuccessStatusCode();
        }

        protected async Task WithDbContextAsync(Func<ApplicationDbContext, Task> action)
        {
            if (_factory is null)
            {
                throw new InvalidOperationException("Test server not initialized.");
            }

            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await action(context);
        }

        protected async Task<T> WithServiceProviderAsync<T>(Func<IServiceProvider, Task<T>> action)
        {
            if (_factory is null)
            {
                throw new InvalidOperationException("Test server not initialized.");
            }

            using var scope = _factory.Services.CreateScope();
            return await action(scope.ServiceProvider);
        }

        protected async Task<string> GetStorageRootAsync()
        {
            return await WithServiceProviderAsync(provider =>
                Task.FromResult(provider.GetRequiredService<IOptions<StorageSettings>>().Value.OnPremiseFileLocation));
        }

        private sealed class LoginResponseEnvelope
        {
            public TokenResponse Tokens { get; set; } = null!;
        }
    }
}