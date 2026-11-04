using System.ComponentModel.DataAnnotations;

namespace Volta.Core.DTOs.Requests;

public class TenantLookupDto
{
    [Required, StringLength(30, MinimumLength = 3)] public string TenantCode { get; set; } = "";
}
