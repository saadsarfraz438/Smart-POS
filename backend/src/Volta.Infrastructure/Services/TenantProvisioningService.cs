using System.Data;
using System.Text.RegularExpressions;
using Azure;
using Azure.Core;
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.Sql;
using Azure.ResourceManager.Sql.Models;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Volta.Core.Entities.TenantData;
using Volta.Infrastructure.Data.Contexts;
using Volta.Infrastructure.Security;

namespace Volta.Infrastructure.Services;

public sealed record ProvisionedTenant(string DatabaseName, string ConnectionString);

public interface ITenantProvisioningService
{
    Task<ProvisionedTenant> ProvisionAsync(string tenantCode, CancellationToken cancellationToken);
    Task DeleteAsync(string databaseName, CancellationToken cancellationToken);
}

public sealed class TenantProvisioningService(
    IConfiguration configuration,
    ILogger<TenantProvisioningService> logger) : ITenantProvisioningService
{
    static readonly Regex TenantCodePattern = new("^[A-Z0-9-]{3,30}$", RegexOptions.Compiled);

    public async Task<ProvisionedTenant> ProvisionAsync(string tenantCode, CancellationToken cancellationToken)
    {
        var code = tenantCode.Trim().ToUpperInvariant();
        if (!TenantCodePattern.IsMatch(code))
            throw new InvalidOperationException("The generated tenant code is invalid.");

        var databaseName = $"Volta_Tenant_{code}";
        var masterConnection = RequiredConnection("Master");
        var template = RequiredConnection("TenantServerTemplate");
        var poolName = configuration["AzureSql:TenantPoolName"] ?? "Volta_Tenant_Pool";
        var useElasticPool = !bool.TryParse(configuration["AzureSql:UseElasticPool"], out var configured) || configured;

        if (configuration["AzureSql:UseManagementSdk"]?.Equals("true", StringComparison.OrdinalIgnoreCase) == true)
        {
            await CreateWithManagementSdkAsync(databaseName, poolName, cancellationToken);
        }
        else
        {
            await CreateWithSqlAsync(databaseName, poolName, useElasticPool, cancellationToken);
        }

        var tenantConnection = string.Format(template, databaseName);
        var options = new DbContextOptionsBuilder<TenantDbContext>()
            .UseSqlServer(tenantConnection, sql => sql.EnableRetryOnFailure(3))
            .Options;
        await using var tenantDb = new TenantDbContext(options);
        await tenantDb.Database.EnsureCreatedAsync(cancellationToken);

        logger.LogInformation("Provisioned tenant database {DatabaseName}.", databaseName);
        return new ProvisionedTenant(databaseName, tenantConnection);
    }

    public async Task DeleteAsync(string databaseName, CancellationToken cancellationToken)
    {
        if (!databaseName.StartsWith("Volta_Tenant_", StringComparison.Ordinal))
            throw new InvalidOperationException("Refusing to delete a database outside the tenant namespace.");

        if (configuration["AzureSql:UseManagementSdk"]?.Equals("true", StringComparison.OrdinalIgnoreCase) == true)
        {
            var server = await GetServerAsync(cancellationToken);
            var databases = server.GetSqlDatabases();
            var existing = await databases.GetIfExistsAsync(databaseName, null, null, cancellationToken);
            if (existing.HasValue && existing.Value is { } resource)
                await resource.DeleteAsync(WaitUntil.Completed, cancellationToken);
        }
        else
        {
            await using var connection = new SqlConnection(RequiredConnection("Master"));
            await connection.OpenAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandTimeout = 180;
            command.CommandText = $"""
                IF DB_ID(N'{SqlLiteral(databaseName)}') IS NOT NULL
                BEGIN
                    ALTER DATABASE {SqlName(databaseName)} SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                    DROP DATABASE {SqlName(databaseName)};
                END
                """;
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        logger.LogWarning("Deleted provisioned tenant database {DatabaseName} after registration failure.", databaseName);
    }

    async Task CreateWithManagementSdkAsync(string databaseName, string poolName, CancellationToken cancellationToken)
    {
        var server = await GetServerAsync(cancellationToken);
        var pool = await server.GetElasticPools().GetAsync(poolName, cancellationToken);
        var database = new SqlDatabaseData(new AzureLocation(configuration["AzureSql:Location"] ?? "EastUS"))
        {
            ElasticPoolId = pool.Value.Id,
        };
        await server.GetSqlDatabases().CreateOrUpdateAsync(
            WaitUntil.Completed, databaseName, database, cancellationToken);
    }

    async Task<SqlServerResource> GetServerAsync(CancellationToken cancellationToken)
    {
        var subscriptionId = configuration["AzureSql:SubscriptionId"]
            ?? throw new InvalidOperationException("AzureSql:SubscriptionId is missing.");
        var resourceGroup = configuration["AzureSql:ResourceGroupName"]
            ?? throw new InvalidOperationException("AzureSql:ResourceGroupName is missing.");
        var serverName = configuration["AzureSql:ServerName"]
            ?? throw new InvalidOperationException("AzureSql:ServerName is missing.");
        var client = new ArmClient(new DefaultAzureCredential());
        var subscription = client.GetSubscriptionResource(new ResourceIdentifier($"/subscriptions/{subscriptionId}"));
        var group = await subscription.GetResourceGroupAsync(resourceGroup, cancellationToken);
        var server = group.Value.GetSqlServer(serverName);
        return server.Value;
    }

    async Task CreateWithSqlAsync(string databaseName, string poolName, bool useElasticPool, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(RequiredConnection("Master"));
        await connection.OpenAsync(cancellationToken);
        var escapedDatabaseName = SqlName(databaseName);
        var escapedPoolName = SqlName(poolName);
        await using var command = connection.CreateCommand();
        command.CommandTimeout = 180;
        command.CommandText = useElasticPool ? $"""
            IF DB_ID(N'{SqlLiteral(databaseName)}') IS NULL
            BEGIN
                CREATE DATABASE {escapedDatabaseName}
                (SERVICE_OBJECTIVE = ELASTIC_POOL (name = {escapedPoolName}));
            END
            """ : $"""
            IF DB_ID(N'{SqlLiteral(databaseName)}') IS NULL
            BEGIN
                CREATE DATABASE {escapedDatabaseName};
            END
            """;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    string RequiredConnection(string name) =>
        configuration.GetConnectionString(name)
        ?? throw new InvalidOperationException($"ConnectionStrings:{name} is missing.");

    static string SqlName(string value) => $"[{value.Replace("]", "]]", StringComparison.Ordinal)}]";
    static string SqlLiteral(string value) => value.Replace("'", "''", StringComparison.Ordinal);
}
