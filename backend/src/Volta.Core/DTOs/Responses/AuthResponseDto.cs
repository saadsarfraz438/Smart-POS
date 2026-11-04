namespace Volta.Core.DTOs.Responses;

public class AuthResponseDto
{
    public string AccessToken { get; set; } = "";
    public string RefreshToken { get; set; } = "";
    public string Role { get; set; } = "";          // owner | admin | inventory | cashier | online
    public string DisplayName { get; set; } = "";
    public bool RequiresOtp { get; set; }           // owner step 1: password OK, OTP sent
}
