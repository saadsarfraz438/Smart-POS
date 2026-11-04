namespace Volta.Core.DTOs.Responses;

public record CashierDto(string Id, string Username, string DisplayName);

public class TenantContextDto
{
    public string TenantContextToken { get; set; } = "";
    public string TenantName { get; set; } = "";
    public string BranchId { get; set; } = "";
    public string BranchName { get; set; } = "";
    public List<CashierDto> Cashiers { get; set; } = new();
}

/// <summary>SERVER-ONLY. Carries the decrypted connection string for one request. Never serialise this (NFR-2.1).</summary>
public sealed record TenantInfo(Guid Id, string Code, string ConnectionString);
