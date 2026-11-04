using Microsoft.EntityFrameworkCore;
using Volta.Core.Interfaces.Infrastructure;
using Volta.Infrastructure.Data.Contexts;

namespace Volta.Infrastructure.Data.Factories;

/// <summary>Builds a TenantDbContext per request from a connection string that only ever lives in server memory.</summary>
public class TenantDbContextFactory : ITenantDbContextFactory
{
    public ITenantDb Create(string connectionString)
    {
        var options = new DbContextOptionsBuilder<TenantDbContext>()
            .UseSqlServer(connectionString, s => s.EnableRetryOnFailure(3))
            .Options;
        return new TenantDbContext(options);
    }
}
