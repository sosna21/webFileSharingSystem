using System;
using System.Threading;
using System.Threading.Tasks;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using Microsoft.Data.SqlClient;
using Respawn;
using Respawn.Graph;
using Testcontainers.MsSql;
using Xunit;

namespace webFileSharingSystem.IntegrationTests.Helpers
{
    public sealed class SqlServerContainerFixture : IAsyncLifetime
    {
        private readonly SemaphoreSlim _respawnerLock = new(1, 1);
        private Respawner? _respawner;

        public SqlServerContainerFixture()
        {
            Container = new MsSqlBuilder()
                .WithImage("mcr.microsoft.com/mssql/server:2022-latest")
                .WithPassword("Strong_password123!")
                .WithEnvironment("ACCEPT_EULA", "Y")
                .WithWaitStrategy(Wait.ForUnixContainer()
                    .UntilCommandIsCompleted("/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P Strong_password123! -C -Q \"SELECT 1\""))
                .Build();
        }

        public MsSqlContainer Container { get; }

        public string ConnectionString => Container.GetConnectionString();

        public async Task InitializeAsync()
        {
            await Container.StartAsync();
        }

        public async Task DisposeAsync()
        {
            await Container.DisposeAsync();
        }

        public async Task EnsureRespawnerAsync()
        {
            if (_respawner is not null)
            {
                return;
            }

            await _respawnerLock.WaitAsync();
            try
            {
                if (_respawner is not null)
                {
                    return;
                }

                await using var connection = new SqlConnection(ConnectionString);
                await connection.OpenAsync();

                _respawner = await Respawner.CreateAsync(connection, new RespawnerOptions
                {
                    DbAdapter = DbAdapter.SqlServer,
                    TablesToIgnore = new Table[] { "__EFMigrationsHistory" }
                });
            }
            finally
            {
                _respawnerLock.Release();
            }
        }

        public async Task ResetDatabaseAsync()
        {
            await EnsureRespawnerAsync();

            await using var connection = new SqlConnection(ConnectionString);
            await connection.OpenAsync();

            await _respawner!.ResetAsync(connection);
        }
    }
}
