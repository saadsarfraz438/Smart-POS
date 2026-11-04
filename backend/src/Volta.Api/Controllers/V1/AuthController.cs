using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Volta.Api.Middlewares;
using Volta.Core.DTOs.Requests;
using Volta.Core.DTOs.Responses;
using Volta.Core.Interfaces.Services;

namespace Volta.Api.Controllers.V1;

[ApiController]
[Route("api/v1/auth")]
[EnableRateLimiting("auth")]
public class AuthController(IAuthService auth, ITenantRegistrationService registration) : ControllerBase
{
    [HttpPost("signup")]
    [ProducesResponseType(typeof(SignupResponseDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<SignupResponseDto>> Signup(SignupRequestDto request, CancellationToken ct)
    {
        var result = await registration.RegisterAsync(request, ct);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginRequestDto dto, CancellationToken ct) =>
        Ok(await auth.LoginAsync(dto, HttpContext.GetTenant(), ct));

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponseDto>> Refresh(RefreshRequestDto dto, CancellationToken ct) =>
        Ok(await auth.RefreshAsync(dto.RefreshToken, HttpContext.GetTenant(), ct));

    [HttpPost("logout"), Authorize]
    public async Task<IActionResult> Logout(LogoutRequestDto dto, CancellationToken ct)
    {
        await auth.LogoutAsync(User, dto.RefreshToken, HttpContext.GetTenant(), ct);
        return NoContent();
    }
}
