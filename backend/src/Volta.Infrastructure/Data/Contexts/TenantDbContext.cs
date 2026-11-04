using Microsoft.EntityFrameworkCore;
using Volta.Core.Entities.TenantData;
using Volta.Core.Interfaces.Infrastructure;

namespace Volta.Infrastructure.Data.Contexts;

public class TenantDbContext(DbContextOptions<TenantDbContext> options) : DbContext(options), ITenantDb
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Terminal> Terminals => Set<Terminal>();
    public DbSet<Shift> Shifts => Set<Shift>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Role>(e =>
        {
            e.Property(x => x.Id).ValueGeneratedNever();
            e.HasData(new Role { Id = 1, Name = RoleNames.Owner }, new Role { Id = 2, Name = RoleNames.Admin },
                      new Role { Id = 3, Name = RoleNames.Inventory }, new Role { Id = 4, Name = RoleNames.Cashier },
                      new Role { Id = 5, Name = RoleNames.Online });
        });
        b.Entity<User>(e =>
        {
            e.HasIndex(x => x.Username).IsUnique();
            e.HasIndex(x => x.Email).IsUnique().HasFilter("[Email] IS NOT NULL");
            e.Property(x => x.Username).HasMaxLength(100);
            e.Property(x => x.Email).HasMaxLength(200);
            e.Property(x => x.BranchId).HasMaxLength(40);
        });
        b.Entity<Terminal>(e => { e.HasKey(x => x.Id); e.Property(x => x.Id).HasMaxLength(20); });
        b.Entity<Shift>(e =>
        {
            e.Property(x => x.TerminalId).HasMaxLength(20);
            e.HasIndex(x => x.TerminalId).IsUnique().HasFilter("[ClosedAtUtc] IS NULL"); // one open shift per terminal
        });
    }
}
