using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Volta.Core.Common;
using Volta.Core.DTOs.Responses;
using Volta.Core.Entities.Master;
using Volta.Core.Interfaces.Infrastructure;
using Volta.Core.Interfaces.Services;
using Volta.Infrastructure.Data.Contexts;
using Volta.Infrastructure.Security;

namespace Volta.Infrastructure.Services;

public class TenantService(MasterDbContext master, IRedisCacheService cache, ITokenService tokens,
    ITenantDbContextFactory dbFactory, ConnectionStringProtector protector) : ITenantService
{
    public sealed record CachedTenant(Guid Id, string Code, string Name, TenantStatus Status, DateTime LicenseExpiryUtc,
        string EncConn, string BranchId, string BranchName);

    static readonly TimeSpan Ttl = TimeSpan.FromMinutes(5);

    async Task<CachedTenant> LoadAsync(string raw, CancellationToken ct)
    {
        var code = raw.Trim(); var upper = code.ToUpperInvariant(); var lower = code.ToLowerInvariant();
        var key = $"tenant:{upper}";
        var json = await cache.GetAsync(key);
        if (json is not null && JsonSerializer.Deserialize<CachedTenant>(json) is { } hit) return hit;

        var t = await master.Tenants.AsNoTracking().FirstOrDefaultAsync(x =>
                    x.Code == upper || x.Domains.Any(d => d.Domain == lower || d.Domain.StartsWith(lower + ".")), ct)
                ?? throw new AppException(ErrorCodes.TenantNotFound, 404, "Invalid Store ID/Domain.");
        var c = new CachedTenant(t.Id, t.Code, t.Name, t.Status, t.LicenseExpiryUtc, t.EncryptedConnectionString, t.DefaultBranchId, t.DefaultBranchName);
        await cache.SetAsync(key, JsonSerializer.Serialize(c), Ttl);   // connection string stays encrypted in Redis
        return c;
    }

    static void EnsureActive(CachedTenant t)
    {
        if (t.Status != TenantStatus.Active || t.LicenseExpiryUtc < DateTime.UtcNow)
            throw new AppException(ErrorCodes.TenantInactive, 403, "This store's subscription is not active.");
    }

    public async Task<TenantContextDto> LookupAsync(string tenantCode, CancellationToken ct)
    {
        var t = await LoadAsync(tenantCode, ct);
        EnsureActive(t);

        using var db = dbFactory.Create(protector.Unprotect(t.EncConn));
        var cashiers = await db.Users.AsNoTracking()
            .Where(u => u.IsActive && u.BranchId == t.BranchId && u.Role!.Name == "cashier")
            .OrderBy(u => u.DisplayName)
            .Select(u => new CashierDto(u.Id.ToString(), u.Username, u.DisplayName))
            .ToListAsync(ct);

        return new TenantContextDto
        {
            TenantContextToken = tokens.CreateTenantContextToken(t.Id, t.Code),
            TenantName = t.Name, BranchId = t.BranchId, BranchName = t.BranchName, Cashiers = cashiers,
        };
    }

    public async Task<TenantInfo> ResolveAsync(string tenantContextToken, CancellationToken ct)
    {
        var parsed = tokens.ValidateTenantContext(tenantContextToken)
            ?? throw new AppException(ErrorCodes.TenantContextInvalid, 401, "Store session expired. Re-enter the Store ID.");
        var t = await LoadAsync(parsed.Code, ct);
        if (t.Id != parsed.TenantId) throw new AppException(ErrorCodes.TenantContextInvalid, 401);
        EnsureActive(t);
        return new TenantInfo(t.Id, t.Code, protector.Unprotect(t.EncConn));
    }
}
