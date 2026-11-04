using System.Security.Claims;

namespace Volta.Core.Interfaces.Services;

public record TokenSubject(Guid UserId, string Role, string DisplayName, Guid TenantId, string TenantCode, string BranchId, string? TerminalId);
public record TokenPair(string AccessToken, string RefreshToken);

public interface ITokenService
{
    string CreateTenantContextToken(Guid tenantId, string tenantCode);
    (Guid TenantId, string Code)? ValidateTenantContext(string token);
    TokenPair CreateTokenPair(TokenSubject subject);
    ClaimsPrincipal? ValidateRefresh(string token);
    Task RevokeAsync(string jti, DateTime expiresUtc);
    Task<bool> IsRevokedAsync(string jti);
}
