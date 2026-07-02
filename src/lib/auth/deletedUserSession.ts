/**
 * Client-side session cleanup and validation after admin deletes a user.
 * Backend global Supabase sign-out revokes refresh tokens; this module actively
 * detects revoked/deleted sessions and clears local state immediately.
 *
 * First-time login: admin-added users have user_id=null until link-user-uid runs.
 * validateServerSession must attempt linking before treating missing membership as revoked.
 */

import { toast } from 'sonner';
import { authService, membershipService } from '@/lib/api';
import { signOutAndClearSession } from '@/lib/auth/authSessionService';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

const ACCESS_CACHE_KEY = 'pyro_access_check';
const SESSION_CHECK_MS = 15_000;
/** Allow login + link-user-uid + JWT refresh to finish before watchdog runs. */
export const SESSION_WATCHDOG_INITIAL_DELAY_MS = 8_000;

export function clearLocalAuthCaches(): void {
  try {
    sessionStorage.removeItem(ACCESS_CACHE_KEY);
    sessionStorage.removeItem('ticketCarouselState');
  } catch {
    /* ignore */
  }
  localStorage.removeItem('user_email');
  localStorage.removeItem('tenant_id');
}

export function getTenantSlugFromPath(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/app\/([^/]+)/);
  const slug = match?.[1];
  if (!slug || slug === 'login' || slug === 'auth') return null;
  return slug;
}

/** Only poll session on tenant app routes — not login, callback, or public auth pages. */
export function shouldRunSessionWatchdog(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  if (!path.startsWith('/app/')) return false;
  if (path.includes('/login') || path.includes('/auth/')) return false;
  return true;
}

export type SessionValidity = 'valid' | 'auth_invalid' | 'membership_invalid' | 'pending';

async function fetchMembership(tenantSlug?: string | null) {
  return membershipService.getMyMembership(tenantSlug ?? undefined);
}

/**
 * First-time users are added with user_id=null. Try link-user-uid before failing validation.
 */
async function linkMembershipIfNeeded(user: User, tenantSlug?: string | null): Promise<void> {
  if (!user.id || !user.email) return;

  try {
    const result = await authService.linkUserUid({ uid: user.id, email: user.email });
    if (result.success === false || result.error) {
      const code = (result as { code?: string }).code;
      if (code === 'NO_TENANT_MEMBERSHIP') return;
      return;
    }
    await supabase.auth.refreshSession();
  } catch (err) {
    console.warn('[deletedUserSession] link-user-uid during validation failed:', err);
  }

  // Re-fetch after link attempt (slug helps backend resolve correct tenant)
  await fetchMembership(tenantSlug);
}

/**
 * Ask Supabase + backend whether this browser session is still allowed.
 * Catches: deleted auth user, revoked refresh tokens, removed tenant membership.
 */
export async function validateServerSession(
  tenantSlug?: string | null
): Promise<SessionValidity> {
  const slug = tenantSlug ?? getTenantSlugFromPath();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return 'auth_invalid';
  }

  let membership = await fetchMembership(slug ?? undefined);
  if (membership?.role_id && membership?.tenant_id) {
    if (slug && membership.tenant_slug && membership.tenant_slug !== slug) {
      return 'membership_invalid';
    }
    return 'valid';
  }

  // First-time login path: link uid to admin-created membership, then re-check
  await linkMembershipIfNeeded(userData.user, slug);
  membership = await fetchMembership(slug ?? undefined);

  if (!membership?.role_id || !membership?.tenant_id) {
    // Auth ok but membership still missing — may still be linking; don't sign out yet
    return 'pending';
  }

  if (slug && membership.tenant_slug && membership.tenant_slug !== slug) {
    return 'membership_invalid';
  }

  return 'valid';
}

export async function forceSignOutRevokedUser(
  reason = 'Your session has ended. Please log in again.',
  loginPath?: string
): Promise<void> {
  clearLocalAuthCaches();
  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch {
    await signOutAndClearSession();
  }
  toast.error(reason);
  const target =
    loginPath ??
    (() => {
      const slug = getTenantSlugFromPath();
      return slug ? `/app/${slug}/login` : '/auth';
    })();
  window.location.replace(target);
}

/**
 * If the deleted account matches the signed-in user, sign out locally immediately.
 */
export async function forceLogoutIfDeletedSelf(
  deletedEmail: string,
  currentEmail: string | undefined | null
): Promise<boolean> {
  const deleted = deletedEmail.trim().toLowerCase();
  const current = currentEmail?.trim().toLowerCase();
  if (!deleted || !current || deleted !== current) {
    return false;
  }

  await forceSignOutRevokedUser('Your account was deleted. You have been signed out.');
  return true;
}

export { SESSION_CHECK_MS };
