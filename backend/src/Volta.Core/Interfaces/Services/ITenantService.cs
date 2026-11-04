using Volta.Core.DTOs.Responses;

namespace Volta.Core.Interfaces.Services;

public interface ITenantService
{
    /// <summary>POST /auth/tenant-lookup (FR-1.2 to FR-1.4)</summary>
    Task<TenantContextDto> LookupAsync(string tenantCode, CancellationToken ct);

    /// <summary>Validates X-Tenant-Context and returns the server-side tenant info for this request.</summary>
    Task<TenantInfo> ResolveAsync(string tenantContextToken, CancellationToken ct);
}
