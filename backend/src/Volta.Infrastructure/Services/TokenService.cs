using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Volta.Core.Interfaces.Infrastructure;
using Volta.Core.Interfaces.Services;

namespace Volta.Infrastructure.Services;

public class JwtOptions
{
    public string Issuer { get; set; } = "volta-api";
    public string AccessAudience { get; set; } = "volta-client";
    public string RefreshAudience { get; set; } = "volta-refresh";
    public string TenantAudience { get; set; } = "volta-tenant";
    public string Key { get; set; } = "";
    public int AccessMinutes { get; set; } = 15;          // SRS 2.3
    public int RefreshHours { get; set; } = 12;           // SRS 2.3
    public int TenantContextMinutes { get; set; } = 30;
}

public class TokenService(IOptions<JwtOptions> options, IRedisCacheService cache) : ITokenService
{
    readonly JwtOptions _o = options.Value;
    SymmetricSecurityKey Key => new(Encoding.UTF8.GetBytes(_o.Key));
    static JwtSecurityTokenHandler Handler => new() { MapInboundClaims = false };

    string Write(IEnumerable<Claim> claims, string audience, TimeSpan life)
    {
        var now = DateTime.UtcNow;
        var token = new JwtSecurityToken(_o.Issuer, audience, claims, now, now.Add(life),
            new SigningCredentials(Key, SecurityAlgorithms.HmacSha256));
        return Handler.WriteToken(token);
    }

    ClaimsPrincipal? Validate(string token, string audience)
    {
        try
        {
            return Handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = true, ValidIssuer = _o.Issuer,
                ValidateAudience = true, ValidAudience = audience,
                ValidateLifetime = true, ClockSkew = TimeSpan.FromSeconds(30),
                ValidateIssuerSigningKey = true, IssuerSigningKey = Key,
                ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },
            }, out _);
        }
        catch { return null; }
    }

    public string CreateTenantContextToken(Guid tenantId, string tenantCode) =>
        Write(new[] { new Claim("tid", tenantId.ToString()), new Claim("tcode", tenantCode), new Claim("jti", Guid.NewGuid().ToString("N")) },
              _o.TenantAudience, TimeSpan.FromMinutes(_o.TenantContextMinutes));

    public (Guid TenantId, string Code)? ValidateTenantContext(string token)
    {
        var p = Validate(token, _o.TenantAudience);
        if (p is null || !Guid.TryParse(p.FindFirst("tid")?.Value, out var id) || p.FindFirst("tcode")?.Value is not { } code) return null;
        return (id, code);
    }

    public TokenPair CreateTokenPair(TokenSubject s)
    {
        List<Claim> Claims(string typ) => new()
        {
            new("sub", s.UserId.ToString()), new("role", s.Role), new("name", s.DisplayName),
            new("tid", s.TenantId.ToString()), new("tcode", s.TenantCode), new("branch", s.BranchId),
            new("jti", Guid.NewGuid().ToString("N")), new("typ", typ),
            new("terminal", s.TerminalId ?? ""),
        };
        return new TokenPair(
            Write(Claims("access"), _o.AccessAudience, TimeSpan.FromMinutes(_o.AccessMinutes)),
            Write(Claims("refresh"), _o.RefreshAudience, TimeSpan.FromHours(_o.RefreshHours)));
    }

    public ClaimsPrincipal? ValidateRefresh(string token) => Validate(token, _o.RefreshAudience);

    public Task RevokeAsync(string jti, DateTime expiresUtc)
    {
        var ttl = expiresUtc - DateTime.UtcNow;
        return ttl > TimeSpan.Zero ? cache.SetAsync($"revoked:{jti}", "1", ttl) : Task.CompletedTask;
    }

    public async Task<bool> IsRevokedAsync(string jti) => await cache.GetAsync($"revoked:{jti}") is not null;
}
