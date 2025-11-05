/**
 * Session-level cache for user data (roles, users, tenants)
 * These are fetched once when user logs in and cached for the entire session
 */

import { apiCache, setCache, getCached, cachedFetch } from './apiCache';
import { supabase } from './supabase';

// Cache keys
const CACHE_KEYS = {
  ROLES: 'session:roles',
  USERS: 'session:users',
  TENANTS: 'session:tenants',
  CURRENT_TENANT: 'session:current_tenant',
} as const;

// Session cache TTL (24 hours - lasts entire session)
const SESSION_TTL = 24 * 60 * 60 * 1000;

/**
 * Fetch and cache roles for the current tenant
 * Uses cachedFetch to prevent duplicate calls
 */
export async function fetchAndCacheRoles(
  token: string,
  tenantSlug: string = 'bibhab-thepyro-ai'
): Promise<any[]> {
  // Check cache first
  const cached = getCached<any[]>(CACHE_KEYS.ROLES);
  if (cached) {
    console.log('[SessionCache] Using cached roles');
    return cached;
  }

  try {
    const baseUrl = import.meta.env.VITE_RENDER_API_URL;
    const apiUrl = `${baseUrl}/membership/roles`;
    
    console.log('[SessionCache] Fetching roles from:', apiUrl);

    // Use cachedFetch to prevent duplicate calls
    const responseData = await cachedFetch<{ results?: any[]; data?: any[] }>(
      apiUrl,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Slug': tenantSlug
        }
      },
      SESSION_TTL // Cache for entire session
    );
    
    // Handle different response formats
    let rolesData: any[] = [];
    if (responseData.results && Array.isArray(responseData.results)) {
      rolesData = responseData.results;
    } else if (Array.isArray(responseData)) {
      rolesData = responseData;
    } else if (responseData.data && Array.isArray(responseData.data)) {
      rolesData = responseData.data;
    }

    // Also cache in session cache for direct access
    setCache(CACHE_KEYS.ROLES, rolesData, SESSION_TTL);
    
    console.log('[SessionCache] Cached roles:', rolesData.length);
    return rolesData;
  } catch (error) {
    console.error('[SessionCache] Error fetching roles:', error);
    throw error;
  }
}

/**
 * Fetch and cache users for the current tenant
 * Uses cachedFetch to prevent duplicate calls
 */
export async function fetchAndCacheUsers(
  token: string,
  tenantSlug: string = 'bibhab-thepyro-ai'
): Promise<any[]> {
  // Check cache first
  const cached = getCached<any[]>(CACHE_KEYS.USERS);
  if (cached) {
    console.log('[SessionCache] Using cached users');
    return cached;
  }

  try {
    const baseUrl = import.meta.env.VITE_RENDER_API_URL;
    const apiUrl = `${baseUrl}/membership/users`;
    
    console.log('[SessionCache] Fetching users from:', apiUrl);

    // Use cachedFetch to prevent duplicate calls
    const responseData = await cachedFetch<{ results?: any[]; data?: any[] }>(
      apiUrl,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Slug': tenantSlug
        }
      },
      SESSION_TTL // Cache for entire session
    );
    
    // Handle different response formats
    let usersData: any[] = [];
    if (responseData.results && Array.isArray(responseData.results)) {
      usersData = responseData.results;
    } else if (Array.isArray(responseData)) {
      usersData = responseData;
    } else if (responseData.data && Array.isArray(responseData.data)) {
      usersData = responseData.data;
    }

    // Also cache in session cache for direct access
    setCache(CACHE_KEYS.USERS, usersData, SESSION_TTL);
    
    console.log('[SessionCache] Cached users:', usersData.length);
    return usersData;
  } catch (error) {
    console.error('[SessionCache] Error fetching users:', error);
    throw error;
  }
}

/**
 * Fetch and cache tenant information
 */
export async function fetchAndCacheTenant(
  userId: string
): Promise<any | null> {
  // Check cache first
  const cached = getCached<any>(CACHE_KEYS.CURRENT_TENANT);
  if (cached) {
    console.log('[SessionCache] Using cached tenant');
    return cached;
  }

  try {
    // Try fetching from tenant_users table
    const { data: tenantUserData, error: tenantUserError } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', userId)
      .single();

    if (tenantUserError || !tenantUserData) {
      console.warn('[SessionCache] No tenant_user found, trying users table');
      
      // Fallback: try users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        console.warn('[SessionCache] No tenant found for user');
        return null;
      }

      const tenantId = userData.tenant_id;
      
      // Fetch tenant details
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (tenantError || !tenantData) {
        return null;
      }

      // Cache the tenant for the entire session
      setCache(CACHE_KEYS.CURRENT_TENANT, tenantData, SESSION_TTL);
      return tenantData;
    }

    const tenantId = tenantUserData.tenant_id;
    
    // Fetch tenant details
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenantData) {
      return null;
    }

    // Cache the tenant for the entire session
    setCache(CACHE_KEYS.CURRENT_TENANT, tenantData, SESSION_TTL);
    
    console.log('[SessionCache] Cached tenant:', tenantData.id);
    return tenantData;
  } catch (error) {
    console.error('[SessionCache] Error fetching tenant:', error);
    return null;
  }
}

/**
 * Pre-fetch all session data (roles, users, tenant) when user logs in
 * This runs in the background and doesn't block the login flow
 */
export async function preloadSessionData(
  token: string,
  userId: string,
  tenantSlug: string = 'bibhab-thepyro-ai'
): Promise<void> {
  console.log('[SessionCache] Preloading session data...');
  
  try {
    // Fetch all data in parallel
    await Promise.all([
      fetchAndCacheRoles(token, tenantSlug).catch(err => 
        console.error('[SessionCache] Failed to preload roles:', err)
      ),
      fetchAndCacheUsers(token, tenantSlug).catch(err => 
        console.error('[SessionCache] Failed to preload users:', err)
      ),
      fetchAndCacheTenant(userId).catch(err => 
        console.error('[SessionCache] Failed to preload tenant:', err)
      ),
    ]);
    
    console.log('[SessionCache] Session data preloaded successfully');
  } catch (error) {
    console.error('[SessionCache] Error preloading session data:', error);
  }
}

/**
 * Get cached roles
 */
export function getCachedRoles(): any[] | null {
  return getCached<any[]>(CACHE_KEYS.ROLES);
}

/**
 * Get cached users
 */
export function getCachedUsers(): any[] | null {
  return getCached<any[]>(CACHE_KEYS.USERS);
}

/**
 * Get cached tenant
 */
export function getCachedTenant(): any | null {
  return getCached<any>(CACHE_KEYS.CURRENT_TENANT);
}

/**
 * Invalidate session cache (roles, users, tenant)
 */
export function invalidateSessionCache(): void {
  apiCache.invalidate(CACHE_KEYS.ROLES);
  apiCache.invalidate(CACHE_KEYS.USERS);
  apiCache.invalidate(CACHE_KEYS.TENANTS);
  apiCache.invalidate(CACHE_KEYS.CURRENT_TENANT);
  console.log('[SessionCache] Invalidated session cache');
}

/**
 * Refresh session cache (force re-fetch)
 */
export async function refreshSessionCache(
  token: string,
  userId: string,
  tenantSlug: string = 'bibhab-thepyro-ai'
): Promise<void> {
  console.log('[SessionCache] Refreshing session cache...');
  
  // Invalidate existing cache
  invalidateSessionCache();
  
  // Pre-load fresh data
  await preloadSessionData(token, userId, tenantSlug);
}

