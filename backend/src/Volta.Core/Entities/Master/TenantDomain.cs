namespace Volta.Core.Entities.Master;

public class TenantDomain
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string Domain { get; set; } = "";             // lower-case, e.g. store.volta.pk
    public Tenant? Tenant { get; set; }
}
