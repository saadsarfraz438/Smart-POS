using System.ComponentModel.DataAnnotations;

namespace Volta.Core.DTOs.Requests;

public sealed class SignupRequestDto
{
    [Required, StringLength(120, MinimumLength = 2)]
    public string StoreName { get; set; } = "";

    [Required, StringLength(120, MinimumLength = 2)]
    public string OwnerName { get; set; } = "";

    [Required, EmailAddress, StringLength(200)]
    public string Email { get; set; } = "";

    [Required, StringLength(128, MinimumLength = 12)]
    public string Password { get; set; } = "";

    [Required, StringLength(40, MinimumLength = 2)]
    public string BranchName { get; set; } = "";
}
