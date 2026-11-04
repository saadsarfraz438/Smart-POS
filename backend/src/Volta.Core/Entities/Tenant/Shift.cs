namespace Volta.Core.Entities.TenantData;

public class Shift
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string TerminalId { get; set; } = "";
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public DateTime OpenedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAtUtc { get; set; }     // null = terminal is in use (FR-4.2)
}
