using System.ComponentModel.DataAnnotations;

namespace Volta.Core.DTOs.Requests;

/// <summary>FR-4.1 payload (+ roleTab and optional owner OTP, as sent by the React login page).</summary>
public class LoginRequestDto
{
    [Required, StringLength(30)] public string TenantCode { get; set; } = "";
    [Required, StringLength(100)] public string Username { get; set; } = "";
    [Required, StringLength(128)] public string PinOrPassword { get; set; } = "";
    [Required, StringLength(40)] public string BranchId { get; set; } = "";
    [Required, StringLength(20)] public string TerminalId { get; set; } = "";
    [StringLength(64)] public string? DeviceFingerprint { get; set; }
    [Required, StringLength(12)] public string RoleTab { get; set; } = "";   // cashier | inventory | admin | online
    [StringLength(6)] public string? Otp { get; set; }
}

public class RefreshRequestDto
{
    [Required] public string RefreshToken { get; set; } = "";
}

public class LogoutRequestDto
{
    public string? RefreshToken { get; set; }
}
