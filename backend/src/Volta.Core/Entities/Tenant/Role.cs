namespace Volta.Core.Entities.TenantData;

public static class RoleNames
{
    public const string Owner = "owner", Admin = "admin", Inventory = "inventory", Cashier = "cashier", Online = "online";
}

public class Role
{
    public int Id { get; set; }          // 1 owner, 2 admin, 3 inventory, 4 cashier, 5 online
    public string Name { get; set; } = "";
}
