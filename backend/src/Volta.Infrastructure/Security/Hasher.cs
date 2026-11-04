using System.Security.Cryptography;
using System.Text;
using Konscious.Security.Cryptography;

namespace Volta.Infrastructure.Security;

/// <summary>Argon2id (64 MB, 3 iterations, parallelism 1 = SRS 2.3) and HMAC-SHA256.</summary>
public static class Hasher
{
    const int MemoryKb = 65536, Iterations = 3, Lanes = 1, HashBytes = 32;

    static byte[] Compute(string secret, byte[] salt)
    {
        using var a = new Argon2id(Encoding.UTF8.GetBytes(secret))
        { Salt = salt, MemorySize = MemoryKb, Iterations = Iterations, DegreeOfParallelism = Lanes };
        return a.GetBytes(HashBytes);
    }

    public static string HashArgon2id(string secret)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        return $"$argon2id$m={MemoryKb},t={Iterations},p={Lanes}${Convert.ToBase64String(salt)}${Convert.ToBase64String(Compute(secret, salt))}";
    }

    public static bool VerifyArgon2id(string secret, string stored)
    {
        var p = stored.Split('$');                     // "", argon2id, params, salt, hash
        if (p.Length != 5 || p[1] != "argon2id") return false;
        try { return CryptographicOperations.FixedTimeEquals(Compute(secret, Convert.FromBase64String(p[3])), Convert.FromBase64String(p[4])); }
        catch (FormatException) { return false; }
    }

    public static string HmacSha256(string key, string data)
    {
        using var h = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        return Convert.ToHexString(h.ComputeHash(Encoding.UTF8.GetBytes(data)));
    }
}

/// <summary>AES-256-GCM protection for tenant connection strings stored in Volta_Master.</summary>
public sealed class ConnectionStringProtector(byte[] key)
{
    public string Protect(string plain)
    {
        var nonce = RandomNumberGenerator.GetBytes(12);
        var pt = Encoding.UTF8.GetBytes(plain);
        var ct = new byte[pt.Length];
        var tag = new byte[16];
        using var g = new AesGcm(key, 16);
        g.Encrypt(nonce, pt, ct, tag);
        return Convert.ToBase64String(nonce.Concat(tag).Concat(ct).ToArray());
    }

    public string Unprotect(string stored)
    {
        var all = Convert.FromBase64String(stored);
        var nonce = all[..12]; var tag = all[12..28]; var ct = all[28..];
        var pt = new byte[ct.Length];
        using var g = new AesGcm(key, 16);
        g.Decrypt(nonce, ct, tag, pt);
        return Encoding.UTF8.GetString(pt);
    }
}
