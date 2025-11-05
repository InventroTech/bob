import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { extractUserInfo } from '@/lib/jwtUtils';
import { cachedFetch } from '@/lib/apiCache';

export interface TenantContext {
  tenantId: string | null;
  role: 'owner' | 'editor' | 'viewer' | null;
  customRole: string | null;
}

// Global cache to prevent multiple simultaneous fetches
let globalTenantCache: {
  tenantId: string | null;
  role: 'owner' | 'editor' | 'viewer' | null;
  customRole: string | null;
  timestamp: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useTenant(): TenantContext {
  const { user, session } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(globalTenantCache?.tenantId || null);
  const [role, setRole] = useState<'owner' | 'editor' | 'viewer' | null>(globalTenantCache?.role || null);
  const [customRole, setCustomRole] = useState<string | null>(globalTenantCache?.customRole || null);

  useEffect(() => {
    if (!user || !session?.access_token) {
      setTenantId(null);
      setRole(null);
      setCustomRole(null);
      return;
    }

    // Check global cache first
    if (globalTenantCache) {
      const now = Date.now();
      if (now - globalTenantCache.timestamp < CACHE_TTL) {
        console.log('useTenant: Using cached tenant info');
        setTenantId(globalTenantCache.tenantId);
        setRole(globalTenantCache.role);
        setCustomRole(globalTenantCache.customRole);
        return;
      }
    }

    // Extract directly from token first
    const userInfo = extractUserInfo(session.access_token);
    const extractedTenantId = userInfo.tenant_id || null;
    const extractedRoleKey = userInfo.role_key || null;
    
    // If token has enriched claims, use them
    if (extractedTenantId && extractedRoleKey) {
      // Map role_key to role for backward compatibility
      let mappedRole: 'owner' | 'editor' | 'viewer' | null = null;
      if (extractedRoleKey) {
        if (extractedRoleKey.toLowerCase() === 'owner' || extractedRoleKey.toLowerCase() === 'gm') {
          mappedRole = 'owner';
        } else if (extractedRoleKey.toLowerCase() === 'editor' || extractedRoleKey.toLowerCase() === 'manager') {
          mappedRole = 'editor';
        } else {
          mappedRole = 'viewer';
        }
      }

      // Update state
      setTenantId(extractedTenantId);
      setRole(mappedRole);
      setCustomRole(extractedRoleKey);

      // Update global cache
      globalTenantCache = {
        tenantId: extractedTenantId,
        role: mappedRole,
        customRole: extractedRoleKey,
        timestamp: Date.now()
      };
    } else {
      // Token not enriched - fallback to existing API endpoint
      // This happens when user logs in via Supabase client-side
      const fetchFromApi = async () => {
        try {
          const baseUrl = (import.meta.env.VITE_RENDER_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
          
          const roleData = await cachedFetch<{
            tenant_id?: string;
            role_key?: string;
            role_name?: string;
            role_id?: string;
          }>(
            `${baseUrl}/membership/me/role`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'X-Tenant-Slug': 'bibhab-thepyro-ai'
              }
            },
            CACHE_TTL
          );
          
          const roleKey = roleData.role_key || null;
          const tenantIdFromApi = roleData.tenant_id || null;
          
          // Map role_key to role for backward compatibility
          let mappedRole: 'owner' | 'editor' | 'viewer' | null = null;
          if (roleKey) {
            if (roleKey.toLowerCase() === 'owner' || roleKey.toLowerCase() === 'gm') {
              mappedRole = 'owner';
            } else if (roleKey.toLowerCase() === 'editor' || roleKey.toLowerCase() === 'manager') {
              mappedRole = 'editor';
            } else {
              mappedRole = 'viewer';
            }
          }
          
          setTenantId(tenantIdFromApi);
          setRole(mappedRole);
          setCustomRole(roleKey);

          // Update global cache
          globalTenantCache = {
            tenantId: tenantIdFromApi,
            role: mappedRole,
            customRole: roleKey,
            timestamp: Date.now()
          };
        } catch (error) {
          console.error('useTenant: Error fetching tenant info from API:', error);
          // Set to null if API call fails
          setTenantId(null);
          setRole(null);
          setCustomRole(null);
        }
      };
      
      fetchFromApi();
    }
  }, [user, session?.access_token]);

  // Clear cache on logout
  useEffect(() => {
    if (!user) {
      globalTenantCache = null;
    }
  }, [user]);

  return { tenantId, role, customRole };
} 