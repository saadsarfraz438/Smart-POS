using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LumensoftPosApi.Data;
using LumensoftPosApi.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var connectionString = builder.Configuration.GetConnectionString("LumensoftConnection")
    ?? "Server=(localdb)\\MSSQLLocalDB;Database=LumensoftPosDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";
builder.Services.AddDbContext<LumensoftDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions =>
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorNumbersToAdd: null)));

var authSection = builder.Configuration.GetSection("Auth");
var signingKey = authSection["SigningKey"] ?? "LumensoftPosApi-Development-Only-Secret-Key-Change-In-Azure";
var issuer = authSection["Issuer"] ?? "LumensoftPosApi";
var audience = authSection["Audience"] ?? "LumensoftPosClient";
var tokenMinutes = authSection.GetValue<int?>("TokenMinutes") ?? 480;
var signingKeyBytes = Encoding.UTF8.GetBytes(signingKey);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = issuer,
            ValidAudience = audience,
            IssuerSigningKey = new SymmetricSecurityKey(signingKeyBytes),
            ClockSkew = TimeSpan.FromMinutes(2)
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("admin"));
    options.AddPolicy("SalespersonOnly", policy => policy.RequireRole("salesperson"));
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<LumensoftDbContext>();
    db.Database.EnsureCreated();
    await EnsureDomainSchemaAsync(db);
    await EnsureAuthSchemaAsync(db);

    if (!await db.Products.AnyAsync())
    {
        db.Products.AddRange(
            new Product { Code = "P-001", Name = "Laptop", CostPrice = 85000, RetailPrice = 105000, ImageUrl = "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=300&q=80", Comment = "Business laptop", EnteredDate = DateTime.Today, CreationDate = DateTime.UtcNow, Status = "Active" },
            new Product { Code = "P-002", Name = "Laptop Bag", CostPrice = 3000, RetailPrice = 4500, ImageUrl = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=300&q=80", Comment = "Premium bag", EnteredDate = DateTime.Today, CreationDate = DateTime.UtcNow, Status = "Active" },
            new Product { Code = "P-003", Name = "Mouse", CostPrice = 1200, RetailPrice = 1800, ImageUrl = "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=300&q=80", Comment = "Ergonomic mouse", EnteredDate = DateTime.Today, CreationDate = DateTime.UtcNow, Status = "Active" }
        );
    }

    if (!await db.Salespersons.AnyAsync())
    {
        db.Salespersons.AddRange(
            new Salesperson { Code = "SP-001", Name = "Ahmed Khan", EnteredDate = DateTime.Today, Phone = "03001234567", Email = "ahmed@lumensoft.com", Address = "Lahore", Status = "Active" },
            new Salesperson { Code = "SP-002", Name = "Sana Ali", EnteredDate = DateTime.Today, Phone = "03009876543", Email = "sana@lumensoft.com", Address = "Karachi", Status = "Active" }
        );
    }

    await db.SaveChangesAsync();
    await EnsureAdminUserAsync(db, builder.Configuration);
}

app.MapPost("/api/auth/login", async (LoginRequest request, LumensoftDbContext db) =>
{
    var email = NormalizeEmail(request.Email);
    if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(new { message = "Email and password are required." });
    }

    var user = await db.AppUsers.Include(item => item.Salesperson).FirstOrDefaultAsync(item => item.Email.ToLower() == email);
    if (user is null || !user.IsActive)
    {
        return Results.Unauthorized();
    }

    if (user.Role == "salesperson" && user.Salesperson is not null && !string.Equals(user.Salesperson.Status?.Trim(), "Active", StringComparison.OrdinalIgnoreCase))
    {
        return Results.Unauthorized();
    }

    var verifier = new PasswordHasher<AppUser>();
    var verification = verifier.VerifyHashedPassword(user, user.PasswordHash, request.Password);
    if (verification == PasswordVerificationResult.Failed)
    {
        return Results.Unauthorized();
    }

    var token = CreateJwtToken(user, issuer, audience, signingKey, tokenMinutes);
    return Results.Ok(new AuthResponse
    {
        Token = token,
        User = BuildUserResponse(user)
    });
});

app.MapGet("/api/auth/me", async (ClaimsPrincipal principal, LumensoftDbContext db) =>
{
    var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
    if (!int.TryParse(userId, out var parsedUserId))
    {
        return Results.Unauthorized();
    }

    var user = await db.AppUsers.Include(item => item.Salesperson).FirstOrDefaultAsync(item => item.Id == parsedUserId);
    if (user is null)
    {
        return Results.Unauthorized();
    }

    return Results.Ok(BuildUserResponse(user));
}).RequireAuthorization();

app.MapGet("/api/products", async (LumensoftDbContext db) =>
    await db.Products.OrderBy(p => p.Code).ToListAsync()).RequireAuthorization();

app.MapPost("/api/products", async (Product product, LumensoftDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(product.Code) || string.IsNullOrWhiteSpace(product.Name))
    {
        return Results.BadRequest(new { message = "Product code and name are required." });
    }

    if (product.CostPrice <= 0 || product.RetailPrice <= 0)
    {
        return Results.BadRequest(new { message = "Cost price and retail price must be greater than zero." });
    }

    if (product.RetailPrice <= product.CostPrice)
    {
        return Results.BadRequest(new { message = "Retail price must be greater than cost price." });
    }

    var normalizedCode = product.Code.Trim().ToLowerInvariant();
    var duplicate = await db.Products.AnyAsync(p => p.Code.ToLower() == normalizedCode);
    if (duplicate)
    {
        return Results.Conflict(new { message = "Product code already exists." });
    }

    product.Code = product.Code.Trim();
    product.Name = product.Name.Trim();
    product.Comment = product.Comment?.Trim();
    product.EnteredDate = product.EnteredDate == default ? DateTime.Today : product.EnteredDate.Date;
    product.CreationDate = DateTime.UtcNow;
    db.Products.Add(product);
    await db.SaveChangesAsync();
    return Results.Created($"/api/products/{product.Id}", product);
}).RequireAuthorization("AdminOnly");

app.MapPut("/api/products/{id}", async (string id, Product updated, LumensoftDbContext db) =>
{
    var existing = await db.Products.FindAsync(id);
    if (existing is null) return Results.NotFound();

    if (string.IsNullOrWhiteSpace(updated.Code) || string.IsNullOrWhiteSpace(updated.Name))
    {
        return Results.BadRequest(new { message = "Product code and name are required." });
    }

    if (updated.CostPrice <= 0 || updated.RetailPrice <= 0)
    {
        return Results.BadRequest(new { message = "Cost price and retail price must be greater than zero." });
    }

    if (updated.RetailPrice <= updated.CostPrice)
    {
        return Results.BadRequest(new { message = "Retail price must be greater than cost price." });
    }

    var duplicate = await db.Products.AnyAsync(p => p.Code != id && p.Code.ToLower() == updated.Code.Trim().ToLower());
    if (duplicate)
    {
        return Results.Conflict(new { message = "Product code already exists." });
    }

    existing.Code = updated.Code.Trim();
    existing.Name = updated.Name.Trim();
    existing.CostPrice = updated.CostPrice;
    existing.RetailPrice = updated.RetailPrice;
    existing.ImageUrl = updated.ImageUrl?.Trim();
    existing.Comment = updated.Comment?.Trim();
    existing.EnteredDate = updated.EnteredDate == default ? existing.EnteredDate : updated.EnteredDate.Date;
    existing.Status = updated.Status;
    await db.SaveChangesAsync();
    return Results.Ok(existing);
}).RequireAuthorization("AdminOnly");

app.MapDelete("/api/products/{id}", async (string id, LumensoftDbContext db) =>
{
    var existing = await db.Products.FindAsync(id);
    if (existing is null) return Results.NotFound();

    var isReferenced = await db.SaleDetails.AnyAsync(item => item.ProductId == id);
    if (isReferenced)
    {
        return Results.Conflict(new { message = "Product cannot be deleted because it is already used in a sale." });
    }

    db.Products.Remove(existing);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization("AdminOnly");

app.MapGet("/api/salespersons", async (LumensoftDbContext db) =>
    await db.Salespersons.OrderBy(s => s.Code).ToListAsync()).RequireAuthorization("AdminOnly");

app.MapPost("/api/salespersons", async (SalespersonUpsertRequest request, LumensoftDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Address))
    {
        return Results.BadRequest(new { message = "Salesperson code, name, phone, email, and address are required." });
    }

    if (string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(new { message = "Salesperson password is required." });
    }

    var normalizedEmail = NormalizeEmail(request.Email);
    var duplicateCode = await db.Salespersons.AnyAsync(s => s.Code.ToLower() == request.Code.Trim().ToLower());
    var duplicatePhone = await db.Salespersons.AnyAsync(s => s.Phone.ToLower() == request.Phone.Trim().ToLower());
    var duplicateEmail = await db.Salespersons.AnyAsync(s => s.Email.ToLower() == normalizedEmail) || await db.AppUsers.AnyAsync(user => user.Email.ToLower() == normalizedEmail);
    if (duplicateCode || duplicatePhone || duplicateEmail)
    {
        return Results.Conflict(new { message = "Salesperson code, phone, or email already exists." });
    }

    var salesperson = new Salesperson
    {
        Code = request.Code.Trim(),
        Name = request.Name.Trim(),
        EnteredDate = request.EnteredDate == default ? DateTime.Today : request.EnteredDate.Date,
        Phone = request.Phone.Trim(),
        Email = normalizedEmail,
        Address = request.Address.Trim(),
        Status = request.Status?.Trim() is { Length: > 0 } status ? status : "Active"
    };

    db.Salespersons.Add(salesperson);

    var appUser = new AppUser
    {
        Email = normalizedEmail,
        Role = "salesperson",
        Salesperson = salesperson,
        IsActive = string.Equals(salesperson.Status, "Active", StringComparison.OrdinalIgnoreCase),
        PasswordHash = new PasswordHasher<AppUser>().HashPassword(new AppUser { Email = normalizedEmail, Role = "salesperson" }, request.Password.Trim())
    };

    db.AppUsers.Add(appUser);
    await db.SaveChangesAsync();
    return Results.Created($"/api/salespersons/{salesperson.Id}", salesperson);
}).RequireAuthorization("AdminOnly");

app.MapPut("/api/salespersons/{id}", async (int id, SalespersonUpsertRequest request, LumensoftDbContext db) =>
{
    var existing = await db.Salespersons.FindAsync(id);
    if (existing is null) return Results.NotFound();

    if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Address))
    {
        return Results.BadRequest(new { message = "Salesperson code, name, phone, email, and address are required." });
    }

    var normalizedEmail = NormalizeEmail(request.Email);
    var duplicateCode = await db.Salespersons.AnyAsync(s => s.Id != id && s.Code.ToLower() == request.Code.Trim().ToLower());
    var duplicatePhone = await db.Salespersons.AnyAsync(s => s.Id != id && s.Phone.ToLower() == request.Phone.Trim().ToLower());
    var duplicateEmail = await db.Salespersons.AnyAsync(s => s.Id != id && s.Email.ToLower() == normalizedEmail);
    var linkedUser = await db.AppUsers.FirstOrDefaultAsync(user => user.SalespersonId == id);
    var linkedUserId = linkedUser?.Id;
    var duplicateAccountEmail = await db.AppUsers.AnyAsync(user => user.Email.ToLower() == normalizedEmail && (!linkedUserId.HasValue || user.Id != linkedUserId.Value));
    if (duplicateCode || duplicatePhone || duplicateEmail || duplicateAccountEmail)
    {
        return Results.Conflict(new { message = "Salesperson code, phone, or email already exists." });
    }

    existing.Code = request.Code.Trim();
    existing.Name = request.Name.Trim();
    existing.EnteredDate = request.EnteredDate == default ? existing.EnteredDate : request.EnteredDate.Date;
    existing.Phone = request.Phone.Trim();
    existing.Email = normalizedEmail;
    existing.Address = request.Address.Trim();
    existing.Status = request.Status?.Trim() is { Length: > 0 } status ? status : existing.Status;

    if (linkedUser is not null)
    {
        linkedUser.Email = normalizedEmail;
        linkedUser.IsActive = string.Equals(existing.Status, "Active", StringComparison.OrdinalIgnoreCase);
        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            linkedUser.PasswordHash = new PasswordHasher<AppUser>().HashPassword(linkedUser, request.Password.Trim());
        }
    }

    await db.SaveChangesAsync();
    return Results.Ok(existing);
}).RequireAuthorization("AdminOnly");

app.MapDelete("/api/salespersons/{id}", async (int id, LumensoftDbContext db) =>
{
    var existing = await db.Salespersons.FindAsync(id);
    if (existing is null) return Results.NotFound();

    var linkedUser = await db.AppUsers.FirstOrDefaultAsync(user => user.SalespersonId == id);
    if (linkedUser is not null)
    {
        db.AppUsers.Remove(linkedUser);
    }

    db.Salespersons.Remove(existing);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization("AdminOnly");

app.MapGet("/api/sales", async (ClaimsPrincipal principal, LumensoftDbContext db) =>
{
    var role = principal.FindFirstValue(ClaimTypes.Role);
    var salespersonId = GetSalespersonId(principal);

    var query = db.Sales.AsNoTracking().OrderByDescending(s => s.SaleDate).Select(s => new
    {
        id = s.Id,
        invoiceNo = s.InvoiceNo,
        saleDate = s.SaleDate,
        salespersonId = s.SalespersonId,
        salespersonName = s.SalespersonName,
        grandTotal = s.Total,
        items = s.Items.Select(item => new
        {
            id = item.Id,
            saleId = item.SaleId,
            productId = item.ProductId,
            retailPrice = item.RetailPrice,
            quantity = item.Quantity,
            discount = item.Discount,
            total = item.Total
        }).ToList()
    });

    if (!string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) && salespersonId.HasValue)
    {
        query = query.Where(sale => sale.salespersonId == salespersonId.Value);
    }

    return Results.Ok(await query.ToListAsync());
}).RequireAuthorization();

app.MapPost("/api/sales", async (ClaimsPrincipal principal, Sale sale, LumensoftDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(sale.InvoiceNo))
    {
        return Results.BadRequest(new { message = "Invoice number is required." });
    }

    if (sale.Items.Count == 0)
    {
        return Results.BadRequest(new { message = "At least one product is required." });
    }

    if (sale.SaleDate.Date != DateTime.Today)
    {
        return Results.BadRequest(new { message = "Sale date must be today." });
    }

    if (sale.Items.Any(item => item.Quantity <= 0))
    {
        return Results.BadRequest(new { message = "Each product quantity must be greater than zero." });
    }

    if (sale.Items.Any(item => item.Discount < 0 || item.Discount > (item.RetailPrice * item.Quantity)))
    {
        return Results.BadRequest(new { message = "Discount must be zero or more and cannot exceed the line total." });
    }

    var currentRole = principal.FindFirstValue(ClaimTypes.Role);
    var currentSalespersonId = GetSalespersonId(principal);
    if (string.Equals(currentRole, "salesperson", StringComparison.OrdinalIgnoreCase))
    {
        if (!currentSalespersonId.HasValue)
        {
            return Results.Forbid();
        }

        sale.SalespersonId = currentSalespersonId.Value;
    }

    var salesperson = await db.Salespersons.FindAsync(sale.SalespersonId);
    if (salesperson is null)
    {
        return Results.BadRequest(new { message = "Selected salesperson was not found." });
    }

    if (!string.Equals(salesperson.Status?.Trim(), "Active", StringComparison.OrdinalIgnoreCase))
    {
        return Results.BadRequest(new { message = "Selected salesperson is inactive." });
    }

    if (string.Equals(currentRole, "salesperson", StringComparison.OrdinalIgnoreCase) && currentSalespersonId.HasValue && salesperson.Id != currentSalespersonId.Value)
    {
        return Results.Forbid();
    }

    var productIds = sale.Items.Select(item => item.ProductId).Distinct().ToList();
    var products = await db.Products.Where(product => productIds.Contains(product.Code)).ToListAsync();
    if (products.Count != productIds.Count)
    {
        return Results.BadRequest(new { message = "One or more selected products were not found." });
    }

    if (products.Any(product => !string.Equals(product.Status?.Trim(), "Active", StringComparison.OrdinalIgnoreCase)))
    {
        return Results.BadRequest(new { message = "One or more selected products are inactive." });
    }

    var duplicateInvoice = await db.Sales.AnyAsync(s => s.InvoiceNo.ToLower() == sale.InvoiceNo.Trim().ToLower());
    if (duplicateInvoice)
    {
        return Results.Conflict(new { message = "Invoice number already exists." });
    }

    sale.InvoiceNo = sale.InvoiceNo.Trim();
    sale.SaleDate = DateTime.Today;
    sale.Total = sale.Items.Sum(item => item.Total);
    if (string.IsNullOrWhiteSpace(sale.SalespersonName))
    {
        sale.SalespersonName = salesperson.Name;
    }

    db.Sales.Add(sale);
    await db.SaveChangesAsync();
    return Results.Created($"/api/sales/{sale.Id}", new
    {
        id = sale.Id,
        invoiceNo = sale.InvoiceNo,
        saleDate = sale.SaleDate,
        salespersonId = sale.SalespersonId,
        salespersonName = sale.SalespersonName,
        grandTotal = sale.Total,
        items = sale.Items.Select(item => new
        {
            id = item.Id,
            saleId = item.SaleId,
            productId = item.ProductId,
            retailPrice = item.RetailPrice,
            quantity = item.Quantity,
            discount = item.Discount,
            total = item.Total
        })
    });
}).RequireAuthorization();

app.MapDelete("/api/sales/{id}", async (int id, LumensoftDbContext db) =>
{
    var existing = await db.Sales.Include(s => s.Items).FirstOrDefaultAsync(s => s.Id == id);
    if (existing is null) return Results.NotFound();
    db.SaleDetails.RemoveRange(existing.Items);
    db.Sales.Remove(existing);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization("AdminOnly");

app.Run();

static async Task EnsureDomainSchemaAsync(LumensoftDbContext db)
{
    var createDomainTablesSql = """
IF OBJECT_ID(N'[dbo].[Products]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Products](
        [ProductCode] NVARCHAR(50) NOT NULL CONSTRAINT [PK_Products] PRIMARY KEY,
        [Name] NVARCHAR(150) NOT NULL,
        [ImageURL] NVARCHAR(500) NULL,
        [EnteredDate] DATE NOT NULL,
        [CostPrice] DECIMAL(12,2) NOT NULL,
        [RetailPrice] DECIMAL(12,2) NOT NULL,
        [Comments] NVARCHAR(500) NULL,
        [CreationDate] DATETIME2 NOT NULL,
        [Status] NVARCHAR(20) NOT NULL,
        CONSTRAINT [CK_Products_CostPrice_Positive] CHECK ([CostPrice] > 0),
        CONSTRAINT [CK_Products_RetailPrice_GreaterThan_CostPrice] CHECK ([RetailPrice] > [CostPrice])
    );
END

IF OBJECT_ID(N'[dbo].[Salesperson]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Salesperson](
        [SalespersonID] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_Salesperson] PRIMARY KEY,
        [Code] NVARCHAR(50) NOT NULL,
        [Name] NVARCHAR(150) NOT NULL,
        [EnteredDate] DATE NOT NULL,
        [Phone] NVARCHAR(30) NOT NULL,
        [Email] NVARCHAR(150) NOT NULL,
        [Address] NVARCHAR(250) NOT NULL,
        [Status] NVARCHAR(20) NOT NULL,
        CONSTRAINT [UX_Salesperson_Code] UNIQUE([Code]),
        CONSTRAINT [UX_Salesperson_Phone] UNIQUE([Phone]),
        CONSTRAINT [UX_Salesperson_Email] UNIQUE([Email])
    );
END

IF OBJECT_ID(N'[dbo].[Sale]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Sale](
        [SaleId] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_Sale] PRIMARY KEY,
        [InvoiceNo] NVARCHAR(50) NOT NULL,
        [Total] DECIMAL(12,2) NOT NULL,
        [SaleDate] DATE NOT NULL,
        [SalespersonId] INT NOT NULL,
        [SalespersonName] NVARCHAR(150) NOT NULL,
        CONSTRAINT [UX_Sale_InvoiceNo] UNIQUE([InvoiceNo]),
        CONSTRAINT [FK_Sale_Salesperson_SalespersonId] FOREIGN KEY([SalespersonId]) REFERENCES [dbo].[Salesperson]([SalespersonID]) ON DELETE NO ACTION,
        CONSTRAINT [CK_Sale_SaleDate_Today] CHECK (CONVERT(date, [SaleDate]) = CONVERT(date, GETDATE()))
    );
END

IF OBJECT_ID(N'[dbo].[SaleDetail]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[SaleDetail](
        [SaleDetailId] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_SaleDetail] PRIMARY KEY,
        [SaleId] INT NOT NULL,
        [ProductId] NVARCHAR(50) NOT NULL,
        [RetailPrice] DECIMAL(12,2) NOT NULL,
        [Quantity] INT NOT NULL,
        [Discount] DECIMAL(12,2) NOT NULL,
        [Total] DECIMAL(12,2) NOT NULL,
        CONSTRAINT [FK_SaleDetail_Sale_SaleId] FOREIGN KEY([SaleId]) REFERENCES [dbo].[Sale]([SaleId]) ON DELETE CASCADE,
        CONSTRAINT [FK_SaleDetail_Products_ProductId] FOREIGN KEY([ProductId]) REFERENCES [dbo].[Products]([ProductCode]) ON DELETE NO ACTION,
        CONSTRAINT [CK_SaleDetail_Quantity_Positive] CHECK ([Quantity] > 0),
        CONSTRAINT [CK_SaleDetail_Discount_NonNegative] CHECK ([Discount] >= 0)
    );
END
""";

    await db.Database.ExecuteSqlRawAsync(createDomainTablesSql);
}

static async Task EnsureAuthSchemaAsync(LumensoftDbContext db)
{
    var createTableSql = """
IF OBJECT_ID(N'[dbo].[AppUsers]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AppUsers](
        [AppUserId] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_AppUsers] PRIMARY KEY,
        [Email] NVARCHAR(150) NOT NULL,
        [PasswordHash] NVARCHAR(500) NOT NULL,
        [Role] NVARCHAR(20) NOT NULL,
        [SalespersonId] INT NULL,
        [IsActive] BIT NOT NULL CONSTRAINT [DF_AppUsers_IsActive] DEFAULT(1),
        [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_AppUsers_CreatedAt] DEFAULT (SYSUTCDATETIME())
    );

    CREATE UNIQUE INDEX [IX_AppUsers_Email] ON [dbo].[AppUsers]([Email]);
    CREATE UNIQUE INDEX [IX_AppUsers_SalespersonId] ON [dbo].[AppUsers]([SalespersonId]) WHERE [SalespersonId] IS NOT NULL;

    ALTER TABLE [dbo].[AppUsers] WITH CHECK
        ADD CONSTRAINT [FK_AppUsers_Salesperson_SalespersonId]
        FOREIGN KEY([SalespersonId]) REFERENCES [dbo].[Salesperson]([SalespersonID]) ON DELETE CASCADE;
END
""";

    await db.Database.ExecuteSqlRawAsync(createTableSql);
}

static async Task EnsureAdminUserAsync(LumensoftDbContext db, IConfiguration configuration)
{
    var adminEmail = NormalizeEmail(configuration["Auth:AdminEmail"] ?? "admin@lumensoft.com");
    var adminPassword = configuration["Auth:AdminPassword"] ?? "Admin@12345";

    var existing = await db.AppUsers.FirstOrDefaultAsync(user => user.Role == "admin");
    if (existing is not null)
    {
        if (!string.Equals(existing.Email, adminEmail, StringComparison.OrdinalIgnoreCase))
        {
            existing.Email = adminEmail;
            await db.SaveChangesAsync();
        }

        return;
    }

    var admin = new AppUser
    {
        Email = adminEmail,
        Role = "admin",
        PasswordHash = new PasswordHasher<AppUser>().HashPassword(new AppUser { Email = adminEmail, Role = "admin" }, adminPassword),
        IsActive = true,
        CreatedAt = DateTime.UtcNow
    };

    db.AppUsers.Add(admin);
    await db.SaveChangesAsync();
}

static string CreateJwtToken(AppUser user, string issuer, string audience, string signingKey, int tokenMinutes)
{
    var claims = new List<Claim>
    {
        new(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new(ClaimTypes.Email, user.Email),
        new(ClaimTypes.Role, user.Role),
        new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
    };

    if (user.SalespersonId.HasValue)
    {
        claims.Add(new Claim("salespersonId", user.SalespersonId.Value.ToString()));
    }

    var token = new JwtSecurityToken(
        issuer: issuer,
        audience: audience,
        claims: claims,
        expires: DateTime.UtcNow.AddMinutes(tokenMinutes),
        signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)), SecurityAlgorithms.HmacSha256)
    );

    return new JwtSecurityTokenHandler().WriteToken(token);
}

static AuthUserResponse BuildUserResponse(AppUser user)
{
    return new AuthUserResponse
    {
        Id = user.Id,
        Role = user.Role,
        Email = user.Email,
        DisplayName = user.Role == "admin" ? "Admin" : user.Salesperson?.Name ?? user.Email,
        SalespersonId = user.SalespersonId
    };
}

static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

static int? GetSalespersonId(ClaimsPrincipal principal)
{
    var value = principal.FindFirstValue("salespersonId");
    return int.TryParse(value, out var parsed) ? parsed : null;
}
