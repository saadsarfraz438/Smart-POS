using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Volta.Core.Common;
using Volta.Core.DTOs.Requests;
using Volta.Core.DTOs.Responses;
using Volta.Core.Entities.Master;
using Volta.Core.Entities.TenantData;
using Volta.Core.Interfaces.Services;
using Volta.Infrastructure.Data.Contexts;
using Volta.Infrastructure.Security;

namespace Volta.Infrastructure.Services;

public sealed class TenantRegistrationService(
    MasterDbContext master,
    ITenantProvisioningService provisioning,
    ConnectionStringProtector protector) : ITenantRegistrationService
{
    public async Task<SignupResponseDto> RegisterAsync(SignupRequestDto request, CancellationToken cancellationToken)
    {
        var storeName = request.StoreName.Trim();
        var ownerName = request.OwnerName.Trim();
        var email = request.Email.Trim().ToLowerInvariant();
        var branchName = request.BranchName.Trim();
        if (string.IsNullOrWhiteSpace(storeName) || string.IsNullOrWhiteSpace(ownerName) ||
            string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(branchName))
            throw new AppException(ErrorCodes.Validation, 400, "Store, owner, email, and branch are required.");

        var tenantCode = await CreateUniqueCodeAsync(cancellationToken);
        var provisioned = await provisioning.ProvisionAsync(tenantCode, cancellationToken);
        try
        {
            await using (var tenantDb = CreateTenantContext(provisioned.ConnectionString))
            {
                var branchId = $"BR-{tenantCode}";
                tenantDb.Users.Add(new User
                {
                    Username = email,
                    Email = email,
                    DisplayName = ownerName,
                    PasswordHash = Hasher.HashArgon2id(request.Password),
                    RoleId = 1,
                    BranchId = branchId,
                });
                tenantDb.Terminals.Add(new Terminal { Id = "T-01", BranchId = branchId, Name = "Main Counter" });
                await tenantDb.SaveChangesAsync(cancellationToken);

                master.Tenants.Add(new Tenant
                {
                    Code = tenantCode,
                    Name = storeName,
                    LicenseExpiryUtc = DateTime.UtcNow.AddYears(1),
                    EncryptedConnectionString = protector.Protect(provisioned.ConnectionString),
                    DefaultBranchId = branchId,
                    DefaultBranchName = branchName,
                });
                await master.SaveChangesAsync(cancellationToken);
            }
        }
        catch
        {
            await provisioning.DeleteAsync(provisioned.DatabaseName, cancellationToken);
            throw;
        }

        return new SignupResponseDto(tenantCode, storeName);
    }

    async Task<string> CreateUniqueCodeAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 10; attempt++)
        {
            var code = $"TRD-{RandomNumberGenerator.GetInt32(1000, 10000)}";
            if (!await master.Tenants.AnyAsync(x => x.Code == code, cancellationToken))
                return code;
        }

        throw new AppException(ErrorCodes.Internal, 500, "Could not allocate a store ID. Try again.");
    }

    static TenantDbContext CreateTenantContext(string connectionString)
    {
        var options = new DbContextOptionsBuilder<TenantDbContext>()
            .UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure(3))
            .Options;
        return new TenantDbContext(options);
    }
}
