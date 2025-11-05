import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { extractUserInfo } from '@/lib/jwtUtils';
import { cachedFetch } from '@/lib/apiCache';

export interface TenantContext {
  tenantId: string | null;
  role: 'owner' | 'editor' | 'viewer' | null;
  customRole: string | null;
}

const TENANT_SLUG = 'bibhab-thepyro-ai'; // Default tenant slug

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
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    async function fetchTenantInfo() {
      if (!user || !session?.access_token) {
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

      // Prevent multiple simultaneous fetches
      if (isFetching) {
        return;
      }

      setIsFetching(true);

      try {
        // Try to extract info from Supabase token (may not have tenant/role info)
        const userInfo = extractUserInfo(session.access_token);
        
        // If token has tenant info, use it
        if (userInfo.tenant_id && userInfo.role_key) {
          console.log('useTenant: Extracted info from token:', userInfo);
          
          const extractedTenantId = userInfo.tenant_id;
          const extractedRoleKey = userInfo.role_key;
          
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
          // Fallback: Fetch from backend API which has access to enriched claims
          console.log('useTenant: Token lacks tenant/role info, fetching from backend API');
          
          const baseUrl = (import.meta.env.VITE_RENDER_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
          
          // Fetch role from backend API (which has access to enriched jwt_claims)
          try {
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
                  'X-Tenant-Slug': TENANT_SLUG
                }
              },
              CACHE_TTL // Cache for 5 minutes
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

            // Use tenant_id from API, or fallback to Supabase query
            let finalTenantId = tenantIdFromApi;
            if (!finalTenantId) {
              const { data: tenantData, error: tenantError } = await supabase
                .from('tenant_users')
                .select('tenant_id')
                .eq('user_id', user.id)
                .single();
              
              finalTenantId = !tenantError && tenantData ? tenantData.tenant_id : null;
            }
            
            setTenantId(finalTenantId);
            setRole(mappedRole);
            setCustomRole(roleKey);

            // Update global cache
            globalTenantCache = {
              tenantId: finalTenantId,
              role: mappedRole,
              customRole: roleKey,
              timestamp: Date.now()
            };
            
            return;
          } catch (apiError) {
            console.warn('useTenant: Failed to fetch role from API, falling back to Supabase:', apiError);
          }
          
          // Final fallback: If API fails, try Supabase tenant_users table
          const { data: tenantData, error: tenantError } = await supabase
            .from('tenant_users')
            .select('tenant_id, role')
            .eq('user_id', user.id)
            .single();
          
          if (!tenantError && tenantData) {
            const fallbackTenantId = tenantData.tenant_id;
            const fallbackRole = tenantData.role as 'owner' | 'editor' | 'viewer';
            
            setTenantId(fallbackTenantId);
            setRole(fallbackRole);

            // Update global cache
            globalTenantCache = {
              tenantId: fallbackTenantId,
              role: fallbackRole,
              customRole: null, // tenant_users table doesn't have role_key
              timestamp: Date.now()
            };
          }
        }
      } catch (error) {
        console.error('useTenant: Error fetching tenant info:', error);
      } finally {
        setIsFetching(false);
      }
    }

    fetchTenantInfo();
  }, [user, session?.access_token, isFetching]);

  // Clear cache on logout
  useEffect(() => {
    if (!user) {
      globalTenantCache = null;
    }
  }, [user]);

  return { tenantId, role, customRole };
} 