/**
 * Cache for Supabase queries (pages, tenants, etc.)
 * Uses sessionStorage to persist across page reloads
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number; // Optional TTL override
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const LONG_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for UID links

// Map to track pending requests for deduplication
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Get cached Supabase query result
 */
export function getCachedSupabaseQuery<T>(key: string): T | null {
  try {
    // Try normal cache first
    let cached = sessionStorage.getItem(key);
    let cacheKey = key;
    
    // If not found, try with TTL suffix (for longer-lived caches)
    if (!cached) {
      const keys = Object.keys(sessionStorage);
      const matchingKey = keys.find(k => k.startsWith(`${key}:ttl_`));
      if (matchingKey) {
        cached = sessionStorage.getItem(matchingKey);
        cacheKey = matchingKey;
      }
    }
    
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();
    const ttl = entry.ttl || CACHE_TTL;

    if (now - entry.timestamp < ttl) {
      console.log(`[SupabaseCache] Cache hit for: ${key}`);
      return entry.data;
    }

    // Cache expired, remove it
    sessionStorage.removeItem(cacheKey);
    return null;
  } catch (error) {
    console.error(`[SupabaseCache] Error reading cache for ${key}:`, error);
    return null;
  }
}

/**
 * Set cached Supabase query result
 */
export function setCachedSupabaseQuery<T>(key: string, data: T, ttl?: number): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    // Store TTL in the key name for longer-lived caches
    const cacheKey = ttl && ttl > CACHE_TTL ? `${key}:ttl_${ttl}` : key;
    sessionStorage.setItem(cacheKey, JSON.stringify({ ...entry, ttl: ttl || CACHE_TTL }));
    console.log(`[SupabaseCache] Cached: ${cacheKey}`);
  } catch (error) {
    console.error(`[SupabaseCache] Error caching ${key}:`, error);
  }
}

/**
 * Get cached value or fetch if not cached (with deduplication)
 * This prevents multiple concurrent requests for the same key
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Check cache first
  const cached = getCachedSupabaseQuery<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Check if there's already a pending request for this key
  const pending = pendingRequests.get(key);
  if (pending) {
    console.log(`[SupabaseCache] Deduplicating request for: ${key}`);
    return pending;
  }

  // Create new request
  console.log(`[SupabaseCache] Fetching: ${key}`);
  const promise = fetcher()
    .then((data) => {
      // Cache the result
      setCachedSupabaseQuery(key, data, ttl);
      // Remove from pending
      pendingRequests.delete(key);
      return data;
    })
    .catch((error) => {
      // Remove from pending on error
      pendingRequests.delete(key);
      throw error;
    });

  // Store pending request
  pendingRequests.set(key, promise);

  return promise;
}

/**
 * Invalidate Supabase query cache
 */
export function invalidateSupabaseQuery(key: string): void {
  sessionStorage.removeItem(key);
  console.log(`[SupabaseCache] Invalidated: ${key}`);
}

/**
 * Clear all Supabase query caches
 */
export function clearSupabaseCache(): void {
  const keys = Object.keys(sessionStorage);
  keys.forEach(key => {
    if (key.startsWith('supabase_cache:')) {
      sessionStorage.removeItem(key);
    }
  });
  console.log('[SupabaseCache] Cleared all Supabase caches');
}

/**
 * Cache keys for Supabase queries
 */
export const SUPABASE_CACHE_KEYS = {
  PAGES: (userId: string, tenantId?: string, roleId?: string) => 
    `supabase_cache:pages:${userId}:${tenantId || 'all'}:${roleId || 'all'}`,
  TENANT: (userId: string) => `supabase_cache:tenant:${userId}`,
  ROLES: (tenantId?: string) => `supabase_cache:roles:${tenantId || 'all'}`,
  TENANT_SLUG: (userId: string) => `supabase_cache:tenant_slug:${userId}`,
} as const;

