using Microsoft.EntityFrameworkCore;
using Volta.Core.Entities.TenantData;

namespace Volta.Core.Interfaces.Infrastructure;

/// <summary>What the services need from a tenant database. Implemented by TenantDbContext.</summary>
public interface ITenantDb : IDisposable
{
    DbSet<User> Users { get; }
    DbSet<Role> Roles { get; }
    DbSet<Terminal> Terminals { get; }
    DbSet<Shift> Shifts { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

public interface ITenantDbContextFactory
{
    /// <summary>Builds a context for one request from a decrypted connection string.</summary>
    ITenantDb Create(string connectionString);
}
