using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Volta.Core.Entities.Master;
using Volta.Core.Entities.TenantData;
using Volta.Infrastructure.Data.Contexts;
using Volta.Infrastructure.Security;

namespace Volta.Infrastructure.Data;

/// <summary>DEVELOPMENT ONLY. Creates a demo tenant TRD-8821 with demo users. Never run in production.</summary>
public static class DevSeeder
{
    public static async Task RunAsync(IServiceProvider sp, string tenantConnection)
    {
        using var scope = sp.CreateScope();
        var master = scope.ServiceProvider.GetRequiredService<MasterDbContext>();
        var protector = sp.GetRequiredService<ConnectionStringProtector>();
        await master.Database.EnsureCreatedAsync();
        if (await master.Tenants.AnyAsync()) return;

        master.Tenants.Add(new Tenant
        {
            Code = "TRD-8821", Name = "Demo Traders", LicenseExpiryUtc = DateTime.UtcNow.AddYears(1),
            EncryptedConnectionString = protector.Protect(tenantConnection),
            DefaultBranchId = "BR-LAHORE-01", DefaultBranchName = "Main Branch - Lahore",
            Domains = { new TenantDomain { Domain = "demo.volta.pk" } },
        });
        await master.SaveChangesAsync();

        using var db = new TenantDbContext(new DbContextOptionsBuilder<TenantDbContext>().UseSqlServer(tenantConnection).Options);
        await db.Database.EnsureCreatedAsync();
        const string br = "BR-LAHORE-01";
        User U(string name, string? email, string display, int role, string? pw, string? pin) => new()
        { Username = name, Email = email, DisplayName = display, RoleId = role, BranchId = br,
          PasswordHash = pw is null ? null : Hasher.HashArgon2id(pw), PinHash = pin is null ? null : Hasher.HashArgon2id(pin) };
        db.Users.AddRange(
            U("owner", "owner@volta.pk", "Store Owner", 1, "Owner#12345", null),
            U("admin", "admin@volta.pk", "Store Admin", 2, "Admin#12345", null),
            U("inv01", null, "Stock Keeper", 3, "Stock#12345", null),
            U("cashier_01", null, "Ali Khan", 4, null, "1234"),
            U("cashier_02", null, "Sara Ahmed", 4, null, "5678"),
            U("online01", null, "Online Desk", 5, "Online#12345", null));
        db.Terminals.Add(new Terminal { Id = "T-01", BranchId = br, Name = "Counter 1" });
        await db.SaveChangesAsync();
    }
}
