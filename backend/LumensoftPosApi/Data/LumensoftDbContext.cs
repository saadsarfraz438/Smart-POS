using LumensoftPosApi.Models;
using Microsoft.EntityFrameworkCore;

namespace LumensoftPosApi.Data;

public class LumensoftDbContext : DbContext
{
    public LumensoftDbContext(DbContextOptions<LumensoftDbContext> options) : base(options) { }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<Salesperson> Salespersons => Set<Salesperson>();
    public DbSet<AppUser> AppUsers => Set<AppUser>();
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<SaleDetail> SaleDetails => Set<SaleDetail>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("Products", table =>
            {
                table.HasCheckConstraint("CK_Products_CostPrice_Positive", "[CostPrice] > 0");
                table.HasCheckConstraint("CK_Products_RetailPrice_GreaterThan_CostPrice", "[RetailPrice] > [CostPrice]");
            });
            entity.HasKey(p => p.Code);
            entity.Property(p => p.Code).HasColumnName("ProductCode").IsRequired().HasMaxLength(50).ValueGeneratedNever();
            entity.Property(p => p.Name).IsRequired().HasMaxLength(150);
            entity.Property(p => p.ImageUrl).HasColumnName("ImageURL").HasMaxLength(500);
            entity.Property(p => p.EnteredDate).HasColumnType("date");
            entity.Property(p => p.CostPrice).HasPrecision(12, 2);
            entity.Property(p => p.RetailPrice).HasPrecision(12, 2);
            entity.Property(p => p.Comment).HasColumnName("Comments").HasMaxLength(500);
            entity.Property(p => p.CreationDate).HasColumnType("datetime2");
            entity.Property(p => p.Status).HasMaxLength(20);
        });

        modelBuilder.Entity<Salesperson>(entity =>
        {
            entity.ToTable("Salesperson");
            entity.Property(s => s.Id).HasColumnName("SalespersonID");
            entity.Property(s => s.Code).IsRequired().HasMaxLength(50);
            entity.Property(s => s.Name).IsRequired().HasMaxLength(150);
            entity.Property(s => s.EnteredDate).HasColumnType("date");
            entity.Property(s => s.Phone).IsRequired().HasMaxLength(30);
            entity.Property(s => s.Email).IsRequired().HasMaxLength(150);
            entity.Property(s => s.Address).IsRequired().HasMaxLength(250);
            entity.HasIndex(s => s.Code).IsUnique();
            entity.HasIndex(s => s.Phone).IsUnique();
            entity.HasIndex(s => s.Email).IsUnique();
        });

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.ToTable("AppUsers");
            entity.Property(u => u.Id).HasColumnName("AppUserId");
            entity.Property(u => u.Email).IsRequired().HasMaxLength(150);
            entity.Property(u => u.PasswordHash).IsRequired().HasMaxLength(500);
            entity.Property(u => u.Role).IsRequired().HasMaxLength(20);
            entity.Property(u => u.CreatedAt).HasColumnType("datetime2");
            entity.Property(u => u.IsActive).HasDefaultValue(true);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasIndex(u => u.SalespersonId).IsUnique().HasFilter("[SalespersonId] IS NOT NULL");
            entity.HasOne(u => u.Salesperson)
                .WithOne()
                .HasForeignKey<AppUser>(u => u.SalespersonId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Sale>(entity =>
        {
            entity.ToTable("Sale", table =>
            {
                table.HasCheckConstraint("CK_Sale_SaleDate_Today", "CONVERT(date, [SaleDate]) = CONVERT(date, GETDATE())");
            });
            entity.Property(s => s.Id).HasColumnName("SaleId");
            entity.Property(s => s.InvoiceNo).IsRequired().HasMaxLength(50);
            entity.HasIndex(s => s.InvoiceNo).IsUnique();
            entity.Property(s => s.SalespersonName).HasMaxLength(150);
            entity.Property(s => s.Total).HasColumnName("Total").HasPrecision(12, 2);
            entity.Property(s => s.SaleDate).HasColumnType("date");
            entity.HasOne(s => s.Salesperson)
                .WithMany(s => s.Sales)
                .HasForeignKey(s => s.SalespersonId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasMany(s => s.Items)
                .WithOne(item => item.Sale)
                .HasForeignKey(item => item.SaleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SaleDetail>(entity =>
        {
            entity.ToTable("SaleDetail", table =>
            {
                table.HasCheckConstraint("CK_SaleDetail_Quantity_Positive", "[Quantity] > 0");
                table.HasCheckConstraint("CK_SaleDetail_Discount_NonNegative", "[Discount] >= 0");
            });
            entity.Property(i => i.Id).HasColumnName("SaleDetailId");
            entity.Property(i => i.ProductId).IsRequired().HasMaxLength(50);
            entity.Property(i => i.RetailPrice).HasPrecision(12, 2);
            entity.Property(i => i.Discount).HasPrecision(12, 2);
            entity.Property(i => i.Total).HasPrecision(12, 2);
            entity.HasOne(i => i.Product)
                .WithMany(p => p.SaleDetails)
                .HasForeignKey(i => i.ProductId)
                .HasPrincipalKey(p => p.Code)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
