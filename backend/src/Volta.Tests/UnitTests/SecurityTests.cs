using Microsoft.Extensions.Options;
using Volta.Core.Interfaces.Infrastructure;
using Volta.Infrastructure.Security;
using Volta.Infrastructure.Services;
using Xunit;

namespace Volta.Tests.UnitTests;

public class SecurityTests
{
    class FakeCache : IRedisCacheService
    {
        readonly Dictionary<string, string> _d = new();
        public Task<string?> GetAsync(string k) => Task.FromResult(_d.GetValueOrDefault(k));
        public Task SetAsync(string k, string v, TimeSpan t) { _d[k] = v; return Task.CompletedTask; }
        public Task RemoveAsync(string k) { _d.Remove(k); return Task.CompletedTask; }
    }

    [Fact]
    public void Argon2id_accepts_right_secret_and_rejects_wrong_one()
    {
        var h = Hasher.HashArgon2id("1234");
        Assert.True(Hasher.VerifyArgon2id("1234", h));
        Assert.False(Hasher.VerifyArgon2id("1235", h));
    }

    [Fact]
    public void ConnectionString_protector_round_trips()
    {
        var p = new ConnectionStringProtector(new byte[32]);
        var enc = p.Protect("Server=x;Database=y");
        Assert.NotEqual("Server=x;Database=y", enc);
        Assert.Equal("Server=x;Database=y", p.Unprotect(enc));
    }

    [Fact]
    public async Task Tenant_token_round_trips_and_revocation_works()
    {
        var t = new TokenService(Options.Create(new JwtOptions { Key = new string('k', 40) }), new FakeCache());
        var id = Guid.NewGuid();
        var parsed = t.ValidateTenantContext(t.CreateTenantContextToken(id, "TRD-8821"));
        Assert.Equal(id, parsed!.Value.TenantId);
        Assert.Null(t.ValidateTenantContext("not-a-token"));

        await t.RevokeAsync("abc", DateTime.UtcNow.AddMinutes(5));
        Assert.True(await t.IsRevokedAsync("abc"));
        Assert.False(await t.IsRevokedAsync("xyz"));
    }
}
