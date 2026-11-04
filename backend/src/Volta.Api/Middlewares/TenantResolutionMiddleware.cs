using Volta.Core.Common;
using Volta.Core.DTOs.Responses;
using Volta.Core.Interfaces.Services;

namespace Volta.Api.Middlewares;

public static class TenantHttpContextExtensions
{
    public const string Key = "Volta.Tenant";
    public static TenantInfo GetTenant(this HttpContext c) => (TenantInfo)c.Items[Key]!;
}

/// <summary>Reads X-Tenant-Context, validates it and makes the per-request TenantInfo available. Skips lookup + health.</summary>
public class TenantResolutionMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext ctx, ITenantService tenants)
    {
        var path = ctx.Request.Path.Value ?? "";
        var needs = path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase)
                    && !path.EndsWith("/tenant-lookup", StringComparison.OrdinalIgnoreCase)
                    && !path.EndsWith("/signup", StringComparison.OrdinalIgnoreCase)
                    && !path.EndsWith("/health", StringComparison.OrdinalIgnoreCase)
                    && !HttpMethods.IsOptions(ctx.Request.Method);
        if (needs)
        {
            if (!ctx.Request.Headers.TryGetValue("X-Tenant-Context", out var h) || string.IsNullOrWhiteSpace(h))
                throw new AppException(ErrorCodes.TenantContextInvalid, 401, "Missing tenant context.");
            ctx.Items[TenantHttpContextExtensions.Key] = await tenants.ResolveAsync(h.ToString(), ctx.RequestAborted);
        }
        await next(ctx);
    }
}
