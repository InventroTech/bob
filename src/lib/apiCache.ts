/**
 * Centralized API request cache and deduplication utility
 * Prevents duplicate API calls from multiple components
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Store the TTL with each entry
  promise?: Promise<T>;
}

class ApiCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data or fetch if not cached
   * Deduplicates concurrent requests - if multiple components request the same endpoint,
   * only one request is made and all components receive the same result
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Check memory cache first
    const cached = this.cache.get(key);
    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < cached.ttl) {
        console.log(`[ApiCache] Cache hit for: ${key}`);
        return cached.data;
      }
      // Cache expired, remove it
      this.cache.delete(key);
    }

    // Check if there's already a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      console.log(`[ApiCache] Deduplicating request for: ${key}`);
      return pending;
    }

    // Create new request
    console.log(`[ApiCache] Fetching: ${key}`);
    const promise = fetcher()
      .then((data) => {
        // Cache the result
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
          ttl,
        });
        // Remove from pending
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        // Remove from pending on error
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store pending request
    this.pendingRequests.set(key, promise);

    return promise;
  }

  /**
   * Set cache value directly
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    console.log(`[ApiCache] Set cache for: ${key}`);
  }

  /**
   * Get cached value without fetching
   */
  getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < cached.ttl) {
        return cached.data as T;
      }
      // Cache expired, remove it
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Invalidate cache for a specific key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    console.log(`[ApiCache] Invalidated cache for: ${key}`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log(`[ApiCache] Cleared all cache`);
  }

  /**
   * Clear cache for a specific pattern (e.g., all endpoints starting with '/membership/')
   */
  clearPattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
    for (const key of this.pendingRequests.keys()) {
      if (regex.test(key)) {
        this.pendingRequests.delete(key);
      }
    }
    console.log(`[ApiCache] Cleared cache matching pattern: ${pattern}`);
  }
}

// Global singleton instance
export const apiCache = new ApiCache();

/**
 * Cached fetch wrapper that automatically deduplicates requests
 */
export async function cachedFetch<T>(
  url: string,
  options: RequestInit = {},
  ttl: number = 5 * 60 * 1000
): Promise<T> {
  const cacheKey = `fetch:${url}:${JSON.stringify(options)}`;
  
  return apiCache.get(
    cacheKey,
    async () => {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json() as Promise<T>;
    },
    ttl
  );
}

/**
 * Invalidate cache for a specific endpoint
 */
export function invalidateEndpoint(endpoint: string): void {
  apiCache.clearPattern(endpoint);
}

/**
 * Clear all API cache (useful on logout)
 */
export function clearApiCache(): void {
  apiCache.clear();
}

/**
 * Set cache value directly
 */
export function setCache<T>(key: string, data: T, ttl?: number): void {
  apiCache.set(key, data, ttl);
}

/**
 * Get cached value without fetching
 */
export function getCached<T>(key: string): T | null {
  return apiCache.getCached<T>(key);
}

