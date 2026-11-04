using Volta.Core.DTOs.Requests;
using Volta.Core.DTOs.Responses;

namespace Volta.Core.Interfaces.Services;

public interface ITenantRegistrationService
{
    Task<SignupResponseDto> RegisterAsync(SignupRequestDto request, CancellationToken cancellationToken);
}
