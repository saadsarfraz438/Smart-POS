namespace Volta.Core.Entities.TenantData;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Username { get; set; } = "";     // stored lower-case
    public string? Email { get; set; }             // stored lower-case
    public string DisplayName { get; set; } = "";
    public string? PasswordHash { get; set; }      // Argon2id
    public string? PinHash { get; set; }           // Argon2id (cashiers)
    public int RoleId { get; set; }
    public Role? Role { get; set; }
    public string BranchId { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public int FailedAttempts { get; set; }
    public DateTime? LockoutUntilUtc { get; set; }
}
