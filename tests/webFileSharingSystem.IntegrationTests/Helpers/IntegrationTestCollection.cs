using Xunit;

namespace webFileSharingSystem.IntegrationTests.Helpers
{
    [CollectionDefinition("IntegrationTests")]
    public sealed class IntegrationTestCollection : ICollectionFixture<SqlServerContainerFixture>
    {
    }
}
