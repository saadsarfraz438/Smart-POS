using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Volta.Core.Common;
using Volta.Core.DTOs.Requests;
using Volta.Core.DTOs.Responses;
using Volta.Core.Entities.TenantData;
using Volta.Core.Interfaces.Infrastructure;
using Volta.Core.Interfaces.Services;
using Volta.Infrastructure.Security;

namespace Volta.Infrastructure.Services;

public class AuthOptions
{
    public bool LogOtpToConsole { get; set; }       // DEV ONLY: replace with real e-mail/SMS delivery
    public int MaxFailedAttempts { get; set; } = 5;
    public int LockMinutes { get; set; } = 5;
}

public class AuthService(ITenantDbContextFactory dbFactory, ITokenService tokens, IRedisCacheService cache,
    IOptions<AuthOptions> options, ILogger<AuthService> log) : IAuthService
{
    static readonly Lazy<string> DummyHash = new(() => Hasher.HashArgon2id("volta-timing-dummy"));
    static readonly TimeSpan StaleShift = TimeSpan.FromHours(12);
    readonly AuthOptions _o = options.Value;

    static string? C(ClaimsPrincipal p, string type) => p.FindFirst(type)?.Value;
    static AppException Invalid() => new(ErrorCodes.InvalidCredentials, 401, "Invalid credentials.");
    static AppException Expired() => new(ErrorCodes.ShiftTokenExpired, 401, "Shift timed out.");
    static DateTime ExpiryOf(ClaimsPrincipal p) =>
        long.TryParse(C(p, "exp"), out var e) ? DateTimeOffset.FromUnixTimeSeconds(e).UtcDateTime : DateTime.UtcNow.AddHours(12);

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto r, TenantInfo t, CancellationToken ct)
    {
        using var db = dbFactory.Create(t.ConnectionString);
        var tab = r.RoleTab.Trim().ToLowerInvariant();
        var allowed = tab switch
        {
            "cashier" => new[] { RoleNames.Cashier },
            "inventory" => new[] { RoleNames.Inventory },
            "online" => new[] { RoleNames.Online },
            "admin" => new[] { RoleNames.Owner, RoleNames.Admin },
            _ => throw new AppException(ErrorCodes.Validation, 400, "Unknown role."),
        };
        var isPin = tab == "cashier";
        var key = r.Username.Trim().ToLowerInvariant();

        var user = await db.Users.Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.IsActive && (u.Username == key || u.Email == key), ct);

        if (user?.LockoutUntilUtc > DateTime.UtcNow)
            throw new AppException(ErrorCodes.AccountLocked, 423, "Too many attempts. Try again later.");

        // Always run one Argon2id verification so unknown users cost the same time as known ones.
        var hash = user is null ? null : isPin ? user.PinHash : user.PasswordHash;
        var verified = Hasher.VerifyArgon2id(r.PinOrPassword, hash ?? DummyHash.Value);
        var scopeOk = user is not null && allowed.Contains(user.Role!.Name)
                      && (tab is not ("cashier" or "inventory") || user.BranchId == r.BranchId);   // branch scope
        var formatOk = !isPin || Regex.IsMatch(r.PinOrPassword, @"^\d{4,6}$");

        if (user is null || hash is null || !verified || !scopeOk || !formatOk)
        {
            await RegisterFailure(db, user, ct);
            throw Invalid();
        }
        var role = user.Role!.Name;

        // Store Owner = dual factor (password + OTP)
        if (role == RoleNames.Owner)
        {
            var otpKey = $"otp:{user.Id}";
            if (string.IsNullOrWhiteSpace(r.Otp))
            {
                var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
                await cache.SetAsync(otpKey, Hasher.HmacSha256(user.Id.ToString(), code), TimeSpan.FromMinutes(5));
                if (_o.LogOtpToConsole) log.LogWarning("DEV OTP for {User}: {Code}", user.Username, code);
                return new AuthResponseDto { RequiresOtp = true, Role = role, DisplayName = user.DisplayName };
            }
            var stored = await cache.GetAsync(otpKey);
            var given = Hasher.HmacSha256(user.Id.ToString(), r.Otp.Trim());
            if (stored is null || !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(stored), Encoding.UTF8.GetBytes(given)))
            {
                await RegisterFailure(db, user, ct);
                throw Invalid();
            }
            await cache.RemoveAsync(otpKey);
        }

        // Cashier: terminal must exist for this branch and not be held by another user (FR-4.2)
        if (role == RoleNames.Cashier)
        {
            var terminal = await db.Terminals.FirstOrDefaultAsync(x => x.Id == r.TerminalId && x.BranchId == r.BranchId && x.IsActive, ct)
                ?? throw new AppException(ErrorCodes.Validation, 400, "Unknown terminal.");
            var open = await db.Shifts.Include(s => s.User).FirstOrDefaultAsync(s => s.TerminalId == terminal.Id && s.ClosedAtUtc == null, ct);
            if (open is not null && DateTime.UtcNow - open.OpenedAtUtc > StaleShift) { open.ClosedAtUtc = DateTime.UtcNow; open = null; }
            if (open is not null && open.UserId != user.Id)
                throw new AppException(ErrorCodes.TerminalLocked, 409, $"Terminal {terminal.Id} is in use.", open.User?.DisplayName);
            if (open is null) db.Shifts.Add(new Shift { TerminalId = terminal.Id, UserId = user.Id });
        }

        user.FailedAttempts = 0;
        user.LockoutUntilUtc = null;
        await db.SaveChangesAsync(ct);

        var pair = tokens.CreateTokenPair(new TokenSubject(user.Id, role, user.DisplayName, t.Id, t.Code, user.BranchId, r.TerminalId));
        return new AuthResponseDto { AccessToken = pair.AccessToken, RefreshToken = pair.RefreshToken, Role = role, DisplayName = user.DisplayName };
    }

    async Task RegisterFailure(ITenantDb db, User? user, CancellationToken ct)
    {
        if (user is null) return;
        user.FailedAttempts++;
        if (user.FailedAttempts >= _o.MaxFailedAttempts)
        {
            user.LockoutUntilUtc = DateTime.UtcNow.AddMinutes(_o.LockMinutes);
            user.FailedAttempts = 0;
        }
        await db.SaveChangesAsync(ct);
    }

    public async Task<AuthResponseDto> RefreshAsync(string refreshToken, TenantInfo t, CancellationToken ct)
    {
        var p = tokens.ValidateRefresh(refreshToken) ?? throw Expired();
        var jti = C(p, "jti");
        if (jti is null || C(p, "tid") != t.Id.ToString() || await tokens.IsRevokedAsync(jti) || !Guid.TryParse(C(p, "sub"), out var uid))
            throw Expired();

        using var db = dbFactory.Create(t.ConnectionString);
        var user = await db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == uid && u.IsActive, ct) ?? throw Expired();

        await tokens.RevokeAsync(jti, ExpiryOf(p));    // refresh tokens are single-use
        var pair = tokens.CreateTokenPair(new TokenSubject(user.Id, user.Role!.Name, user.DisplayName, t.Id, t.Code, user.BranchId, C(p, "terminal")));
        return new AuthResponseDto { AccessToken = pair.AccessToken, RefreshToken = pair.RefreshToken, Role = user.Role.Name, DisplayName = user.DisplayName };
    }

    public async Task LogoutAsync(ClaimsPrincipal access, string? refreshToken, TenantInfo t, CancellationToken ct)
    {
        if (C(access, "tid") != t.Id.ToString()) throw new AppException(ErrorCodes.TenantContextInvalid, 401);
        if (C(access, "jti") is { } aj) await tokens.RevokeAsync(aj, ExpiryOf(access));
        if (refreshToken is not null && tokens.ValidateRefresh(refreshToken) is { } rp && C(rp, "jti") is { } rj)
            await tokens.RevokeAsync(rj, ExpiryOf(rp));

        if (Guid.TryParse(C(access, "sub"), out var uid))
        {
            using var db = dbFactory.Create(t.ConnectionString);
            var open = await db.Shifts.Where(s => s.UserId == uid && s.ClosedAtUtc == null).ToListAsync(ct);
            foreach (var s in open) s.ClosedAtUtc = DateTime.UtcNow;   // frees the terminal; swap for a real cash-drawer close flow later
            await db.SaveChangesAsync(ct);
        }
    }
}
