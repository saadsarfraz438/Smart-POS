using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Volta.Core.DTOs.Requests;
using Volta.Core.DTOs.Responses;
using Volta.Core.Interfaces.Services;

namespace Volta.Api.Controllers.V1;

[ApiController]
[Route("api/v1")]
public class TenantController(ITenantService tenants) : ControllerBase
{
    /// <summary>FR-1.2: called by the login page when the Store ID field loses focus.</summary>
    [HttpPost("auth/tenant-lookup"), EnableRateLimiting("auth")]
    public async Task<ActionResult<TenantContextDto>> Lookup(TenantLookupDto dto, CancellationToken ct) =>
        Ok(await tenants.LookupAsync(dto.TenantCode, ct));

    /// <summary>Polled by the frontend every 30 s for the online/latency indicator.</summary>
    [HttpGet("health")]
    public IActionResult Health() => Ok(new { status = "ok", timeUtc = DateTime.UtcNow });
}
