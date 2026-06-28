using Xunit;

namespace webFileSharingSystem.IntegrationTests.Helpers
{
    [CollectionDefinition("IntegrationTests", DisableParallelization = true)]
    public sealed class IntegrationTestCollection : ICollectionFixture<SqlServerContainerFixture>
    {
    }
}
