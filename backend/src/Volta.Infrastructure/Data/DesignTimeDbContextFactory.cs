using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Volta.Infrastructure.Data.Contexts;

namespace Volta.Infrastructure.Data;

public sealed class MasterDbContextDesignFactory : IDesignTimeDbContextFactory<MasterDbContext>
{
    public MasterDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<MasterDbContext>()
            .UseSqlServer("Server=localhost;Database=Volta_Master;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;
        return new MasterDbContext(options);
    }
}

public sealed class TenantDbContextDesignFactory : IDesignTimeDbContextFactory<TenantDbContext>
{
    public TenantDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<TenantDbContext>()
            .UseSqlServer("Server=localhost;Database=Volta_Tenant_MIGRATION;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;
        return new TenantDbContext(options);
    }
}
