using System.Text.Json;
using System.Text.Json.Serialization;
using Volta.Core.Common;

namespace Volta.Api.Middlewares;

public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> log)
{
    static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull };

    public async Task InvokeAsync(HttpContext ctx)
    {
        try { await next(ctx); }
        catch (AppException ex) { await Write(ctx, ex.Status, ex.Code, ex.Message, ex.User); }
        catch (OperationCanceledException) { ctx.Response.StatusCode = 499; }
        catch (Exception ex)
        {
            log.LogError(ex, "Unhandled exception");
            await Write(ctx, 500, ErrorCodes.Internal, "Something went wrong.", null);   // never leak internals
        }
    }

    static Task Write(HttpContext ctx, int status, string code, string message, string? user)
    {
        if (ctx.Response.HasStarted) return Task.CompletedTask;
        ctx.Response.StatusCode = status;
        ctx.Response.ContentType = "application/json";
        return ctx.Response.WriteAsync(JsonSerializer.Serialize(new { code, message, user }, Json));
    }
}
