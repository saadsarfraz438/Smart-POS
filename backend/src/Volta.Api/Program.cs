using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Volta.Api.Middlewares;
using Volta.Core.Interfaces.Infrastructure;
using Volta.Core.Interfaces.Services;
using Volta.Infrastructure.Data;
using Volta.Infrastructure.Data.Contexts;
using Volta.Infrastructure.Data.Factories;
using Volta.Infrastructure.Security;
using Volta.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);
var cfg = builder.Configuration;

builder.Services.Configure<JwtOptions>(cfg.GetSection("Jwt"));
builder.Services.Configure<AuthOptions>(cfg.GetSection("Auth"));
var jwt = cfg.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
if (jwt.Key.Length < 32) throw new InvalidOperationException("Jwt:Key must be at least 32 characters. Set it with user-secrets or Key Vault.");

var connKey = Convert.FromBase64String(cfg["Security:ConnectionKey"] ?? throw new InvalidOperationException("Security:ConnectionKey (base64, 32 bytes) is missing."));
if (connKey.Length != 32) throw new InvalidOperationException("Security:ConnectionKey must decode to 32 bytes.");
builder.Services.AddSingleton(new ConnectionStringProtector(connKey));

builder.Services.AddDbContext<MasterDbContext>(o => o.UseSqlServer(cfg.GetConnectionString("Master"), s => s.EnableRetryOnFailure(3)));

var redis = cfg.GetConnectionString("Redis");
if (string.IsNullOrWhiteSpace(redis)) builder.Services.AddDistributedMemoryCache();
else builder.Services.AddStackExchangeRedisCache(o => o.Configuration = redis);

builder.Services.AddSingleton<ITenantDbContextFactory, TenantDbContextFactory>();
builder.Services.AddScoped<ITenantProvisioningService, TenantProvisioningService>();
builder.Services.AddScoped<ITenantRegistrationService, TenantRegistrationService>();
builder.Services.AddSingleton<IRedisCacheService, RedisCacheService>();
builder.Services.AddSingleton<ITokenService, TokenService>();
builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddScoped<IAuthService, AuthService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.MapInboundClaims = false;
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidIssuer = jwt.Issuer,
        ValidateAudience = true, ValidAudience = jwt.AccessAudience,
        ValidateLifetime = true, ClockSkew = TimeSpan.FromSeconds(30),
        ValidateIssuerSigningKey = true, IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
        RoleClaimType = "role", NameClaimType = "name",
    };
    o.Events = new JwtBearerEvents
    {
        OnTokenValidated = async ctx =>
        {
            var tokens = ctx.HttpContext.RequestServices.GetRequiredService<ITokenService>();
            var jti = ctx.Principal?.FindFirst("jti")?.Value;
            if (jti is not null && await tokens.IsRevokedAsync(jti)) ctx.Fail("Token revoked.");   // revocation list in Redis
        },
    };
});
builder.Services.AddAuthorization();

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(cfg.GetSection("Cors:Origins").Get<string[]>() ?? Array.Empty<string>())
    .AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 30, Window = TimeSpan.FromMinutes(1) }));
});

builder.Services.AddControllers();

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    await scope.ServiceProvider.GetRequiredService<MasterDbContext>().Database.MigrateAsync();
}

if (app.Environment.IsDevelopment())
    await DevSeeder.RunAsync(app.Services, cfg["Seed:TenantConnection"] ?? throw new InvalidOperationException("Seed:TenantConnection missing."));

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();
if (!app.Environment.IsDevelopment()) app.UseHttpsRedirection();
app.UseCors();
app.UseRateLimiter();
app.UseMiddleware<TenantResolutionMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
