using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace LumensoftPosApi.Models;

public class Product
{
    [Key]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    [NotMapped]
    [JsonPropertyName("id")]
    public string Id => Code;

    [Required]
    public string Name { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }

    public DateTime EnteredDate { get; set; } = DateTime.Today;

    [Required]
    public decimal CostPrice { get; set; }

        [Required]
        [JsonPropertyName("retailPrice")]
    public decimal RetailPrice { get; set; }

    public string? Comment { get; set; }
    public DateTime CreationDate { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "Active";

    public List<SaleDetail> SaleDetails { get; set; } = new();
}

public class Salesperson
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string Code { get; set; } = string.Empty;

    [Required]
    public string Name { get; set; } = string.Empty;

    public DateTime EnteredDate { get; set; } = DateTime.Today;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Phone { get; set; } = string.Empty;

    [Required]
    public string Address { get; set; } = string.Empty;

    public string Status { get; set; } = "Active";

    [JsonIgnore]
    public List<Sale> Sales { get; set; } = new();
}

public class AppUser
{
    [Key]
    public int Id { get; set; }

    [Required]
    [EmailAddress]
    [MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [JsonIgnore]
    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Role { get; set; } = "salesperson";

    public int? SalespersonId { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public Salesperson? Salesperson { get; set; }
}

public class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class SalespersonUpsertRequest
{
    [Required]
    public string Code { get; set; } = string.Empty;

    [Required]
    public string Name { get; set; } = string.Empty;

    public DateTime EnteredDate { get; set; } = DateTime.Today;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Phone { get; set; } = string.Empty;

    [Required]
    public string Address { get; set; } = string.Empty;

    public string Status { get; set; } = "Active";

    public string? Password { get; set; }
}

public class AuthUserResponse
{
    public int Id { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public int? SalespersonId { get; set; }
}

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public AuthUserResponse User { get; set; } = new();
}

public class SaleDetail
{
    [Key]
    public int Id { get; set; }

    public int SaleId { get; set; }

    [Required]
    public string ProductId { get; set; } = string.Empty;

    public decimal RetailPrice { get; set; }

    public int Quantity { get; set; }

    public decimal Discount { get; set; }

    public decimal Total { get; set; }

    [JsonIgnore]
    public Sale? Sale { get; set; }
    [JsonIgnore]
    public Product? Product { get; set; }
}

public class Sale
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string InvoiceNo { get; set; } = string.Empty;

    public decimal Total { get; set; }

    public DateTime SaleDate { get; set; }
    public int SalespersonId { get; set; }
    public string SalespersonName { get; set; } = string.Empty;

    [NotMapped]
    [JsonPropertyName("grandTotal")]
    public decimal GrandTotal => Total;

    [JsonIgnore]
    public Salesperson? Salesperson { get; set; }
    public List<SaleDetail> Items { get; set; } = new();
}
