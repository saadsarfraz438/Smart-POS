using System.Security.Claims;
using Volta.Core.DTOs.Requests;
using Volta.Core.DTOs.Responses;

namespace Volta.Core.Interfaces.Services;

public interface IAuthService
{
    Task<AuthResponseDto> LoginAsync(LoginRequestDto request, TenantInfo tenant, CancellationToken ct);
    Task<AuthResponseDto> RefreshAsync(string refreshToken, TenantInfo tenant, CancellationToken ct);
    Task LogoutAsync(ClaimsPrincipal access, string? refreshToken, TenantInfo tenant, CancellationToken ct);
}
