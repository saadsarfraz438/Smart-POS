using Microsoft.Extensions.Caching.Distributed;
using Volta.Core.Interfaces.Infrastructure;

namespace Volta.Infrastructure.Services;

/// <summary>Azure Cache for Redis in production, in-memory cache when no Redis connection string is set.</summary>
public class RedisCacheService(IDistributedCache cache) : IRedisCacheService
{
    public Task<string?> GetAsync(string key) => cache.GetStringAsync(key);
    public Task SetAsync(string key, string value, TimeSpan ttl) =>
        cache.SetStringAsync(key, value, new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });
    public Task RemoveAsync(string key) => cache.RemoveAsync(key);
}
