using Microsoft.EntityFrameworkCore;
using Volta.Core.Entities.Master;

namespace Volta.Infrastructure.Data.Contexts;

public class MasterDbContext(DbContextOptions<MasterDbContext> options) : DbContext(options)
{
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<TenantDomain> TenantDomains => Set<TenantDomain>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Tenant>(e =>
        {
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Code).HasMaxLength(30);
            e.Property(x => x.Name).HasMaxLength(120);
            e.Property(x => x.DefaultBranchId).HasMaxLength(40);
            e.Property(x => x.DefaultBranchName).HasMaxLength(120);
            e.HasMany(x => x.Domains).WithOne(d => d.Tenant).HasForeignKey(d => d.TenantId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<TenantDomain>(e => { e.HasIndex(x => x.Domain).IsUnique(); e.Property(x => x.Domain).HasMaxLength(120); });
    }
}
