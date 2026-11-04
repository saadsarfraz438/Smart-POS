namespace Volta.Core.Common;

public static class ErrorCodes
{
    public const string TenantNotFound = "ERR_TENANT_NOT_FOUND";
    public const string TenantInactive = "ERR_TENANT_INACTIVE";
    public const string TenantContextInvalid = "ERR_TENANT_CONTEXT_INVALID";
    public const string TerminalLocked = "ERR_TERMINAL_LOCKED";
    public const string ShiftTokenExpired = "ERR_SHIFT_TOKEN_EXPIRED";
    public const string InvalidCredentials = "ERR_INVALID_CREDENTIALS";
    public const string AccountLocked = "ERR_ACCOUNT_LOCKED";
    public const string Validation = "ERR_VALIDATION";
    public const string TenantExists = "ERR_TENANT_EXISTS";
    public const string Internal = "ERR_INTERNAL";
}

/// <summary>Thrown for expected failures. ExceptionHandlingMiddleware turns it into { code, message, user }.</summary>
public class AppException(string code, int status, string? message = null, string? user = null) : Exception(message ?? code)
{
    public string Code { get; } = code;
    public int Status { get; } = status;
    public string? User { get; } = user;
}
