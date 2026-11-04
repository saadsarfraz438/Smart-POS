# Volta.Backend (login module)

.NET 8 Web API for the Volta React login page. Matches the frontend contract:

| Method | Route | Notes |
|---|---|---|
| POST | /api/v1/auth/tenant-lookup | `{ TenantCode }` -> tenantContextToken, branch, cashier list |
| POST | /api/v1/auth/login | header `X-Tenant-Context`; FR-4.1 body + `roleTab`, optional `otp` |
| POST | /api/v1/auth/refresh | `{ refreshToken }` (single use) |
| POST | /api/v1/auth/logout | Bearer access token; revokes tokens, frees the terminal |
| GET  | /api/v1/health | used by the footer latency indicator |

Errors are `{ code, message, user? }` using the SRS codes.

## Run (development)
1. SQL Server (LocalDB/Docker) running; edit `appsettings.Development.json` if your server differs.
2. `dotnet run --project src/Volta.Api` — the dev seeder creates `Volta_Master`, `Volta_Tenant_A89F` and tenant **TRD-8821**.
3. Frontend: `VITE_API_URL=https://localhost:<port>` and allow its origin in `Cors:Origins`.

Demo logins (dev only): cashier_01 / PIN 1234, cashier_02 / 5678, admin / Admin#12345, inv01 / Stock#12345, online01 / Online#12345, owner / Owner#12345 (+ OTP printed in the API console).

## Production
Set `Jwt:Key`, `Security:ConnectionKey` (base64, 32 bytes), connection strings and `Cors:Origins` via Key Vault / env vars. Replace the OTP console log with real e-mail/SMS delivery. Use EF migrations (`dotnet ef migrations add Init -c MasterDbContext` / `-c TenantDbContext`) instead of `EnsureCreated`.
