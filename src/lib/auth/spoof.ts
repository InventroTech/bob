/**
 * User spoofing utilities.
 * When spoofing is active, the spoof JWT is used instead of the real session token.
 */

import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth/authClient';
import { pageService } from '@/lib/api';

export const SPOOF_JWT_KEY = 'pyro_spoof_jwt';
export const SPOOF_LABEL_KEY = 'pyro_spoof_user_label';
export const SPOOF_ORIGINAL_JWT_KEY = 'pyro_spoof_original_jwt';
export const SPOOF_CHANGED_EVENT = 'pyro-spoof-changed';

export function dispatchSpoofChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SPOOF_CHANGED_EVENT));
  }
}

/** Remove spoof keys from localStorage (no navigation or event dispatch). */
export function clearSpoofLocalStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SPOOF_JWT_KEY);
    window.localStorage.removeItem(SPOOF_ORIGINAL_JWT_KEY);
    window.localStorage.removeItem(SPOOF_LABEL_KEY);
  } catch (err) {
    console.warn('Failed to clear spoof storage', err);
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

/** Decode JWT payload (no verification; for client-side `sub` only). */
function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Supabase user id (`sub`) from the active spoof JWT, if any.
 * Use for URL placeholders so {{current_user}} matches API identity while spoofing.
 */
export function getSpoofUserId(): string | null {
  if (typeof window === 'undefined') return null;
  const token = window.localStorage.getItem(SPOOF_JWT_KEY);
  if (!token) return null;
  const payload = parseJwtPayload(token);
  const sub = payload?.sub;
  return typeof sub === 'string' ? sub : null;
}

/**
 * Reacts to spoof start/stop so components can use the spoofed user's id for templates.
 */
export function useSpoofUserId(): string | null {
  const [id, setId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? getSpoofUserId() : null
  );

  useEffect(() => {
    const sync = () => setId(getSpoofUserId());
    if (typeof window === 'undefined') return;
    window.addEventListener(SPOOF_CHANGED_EVENT, sync);
    const onStorage = (e: StorageEvent) => {
      if (e.key === SPOOF_JWT_KEY) sync();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SPOOF_CHANGED_EVENT, sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return id;
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
  const { data } = await authClient.getSession();
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
): Promise<{
  id: string;
  name: string;
  display_order: number;
  icon_name: string;
  header_title?: string;
}[]> {
  const pages = await pageService.getPagesForRole(tenantId, roleId);
  return pages ?? [];
}

/**
 * Fetch a single page config using the backend Pages API.
 */
export async function fetchPageConfig(
  pageId: string,
  tenantId: string,
  token: string
): Promise<{ name: string; config: any; header_title?: string } | null> {
  const page = await pageService.getPageById(pageId, tenantId, true);
  if (!page) return null;
  return {
    name: page.name ?? '',
    config: page.config,
    header_title: page.header_title,
  };
}
