/**
 * User spoofing utilities.
 * When spoofing is active, the spoof JWT is used instead of the real session token.
 */

import { supabase, getSupabaseRestConfig } from '@/lib/supabase';
import { pageService } from '@/lib/api';

const SPOOF_JWT_KEY = 'pyro_spoof_jwt';
const SPOOF_LABEL_KEY = 'pyro_spoof_user_label';
export const SPOOF_CHANGED_EVENT = 'pyro-spoof-changed';

export function dispatchSpoofChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SPOOF_CHANGED_EVENT));
  }
}

export function isSpoofing(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.localStorage.getItem(SPOOF_JWT_KEY);
}

export function getSpoofUserLabel(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(SPOOF_LABEL_KEY);
}

/**
 * Returns the effective auth token: spoof token if spoofing, else Supabase session token.
 */
export async function getEffectiveToken(sessionToken?: string | null): Promise<string | null> {
  try {
    const spoofToken = typeof window !== 'undefined' && window.localStorage.getItem(SPOOF_JWT_KEY);
    if (spoofToken) return spoofToken;
  } catch (err) {
    console.warn('Unable to read spoof token from localStorage', err);
  }

  if (sessionToken) return sessionToken;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Fetch pages for the custom app using the backend Pages API.
 * The backend will see the spoof token (via apiClient interceptors) when spoofing is active.
 */
export async function fetchPagesForRole(
  tenantId: string,
  roleId: string,
  token: string
): Promise<{ id: string; name: string; display_order: number; icon_name: string }[]> {
  // First try the backend Pages API (preferred path).
  try {
    const pages = await pageService.getPagesForRole(tenantId, roleId);
    if (pages && pages.length > 0) {
      return pages;
    }
  } catch (err) {
    console.warn('pageService.getPagesForRole failed, falling back to Supabase REST:', err);
  }

  // Fallback: call Supabase REST directly with the provided token (spoof or real),
  // preserving the original behavior so existing tenants still see their pages.
  const { url, anonKey } = getSupabaseRestConfig();
  const params = new URLSearchParams({
    tenant_id: `eq.${tenantId}`,
    role: `eq.${roleId}`,
    select: 'id,name,display_order,icon_name',
    order: 'display_order.asc',
  });
  const res = await fetch(`${url}/rest/v1/pages?${params}`, {
    method: 'GET',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase pages fetch failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch a single page config using the backend Pages API.
 */
export async function fetchPageConfig(
  pageId: string,
  tenantId: string,
  token: string
): Promise<{ name: string; config: unknown } | null> {
  // Preferred: backend Pages API via pageService.
  try {
    const page = await pageService.getPageById(pageId, tenantId);
    if (page) {
      return page;
    }
  } catch (err) {
    console.warn('pageService.getPageById failed, falling back to Supabase REST:', err);
  }

  // Fallback: direct Supabase REST call with token.
  const { url, anonKey } = getSupabaseRestConfig();
  const params = new URLSearchParams({
    id: `eq.${pageId}`,
    tenant_id: `eq.${tenantId}`,
    select: 'name,config',
  });
  const res = await fetch(`${url}/rest/v1/pages?${params}`, {
    method: 'GET',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase page fetch failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) return data[0];
  if (data && typeof data === 'object' && 'name' in data) return data;
  return null;
}
