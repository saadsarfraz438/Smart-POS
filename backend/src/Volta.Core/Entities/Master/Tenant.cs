namespace Volta.Core.Entities.Master;

public enum TenantStatus { Active = 1, Suspended = 2 }

public class Tenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = "";               // upper-case, e.g. TRD-8821
    public string Name { get; set; } = "";
    public TenantStatus Status { get; set; } = TenantStatus.Active;
    public DateTime LicenseExpiryUtc { get; set; }
    public string EncryptedConnectionString { get; set; } = ""; // AES-GCM; never leaves the server (NFR-2.1)
    public string DefaultBranchId { get; set; } = "";
    public string DefaultBranchName { get; set; } = "";
    public List<TenantDomain> Domains { get; set; } = new();
}
