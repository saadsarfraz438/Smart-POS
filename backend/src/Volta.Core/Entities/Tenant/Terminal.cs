namespace Volta.Core.Entities.TenantData;

public class Terminal
{
    public string Id { get; set; } = "";           // T-01
    public string BranchId { get; set; } = "";
    public string Name { get; set; } = "";
    public bool IsActive { get; set; } = true;
}
