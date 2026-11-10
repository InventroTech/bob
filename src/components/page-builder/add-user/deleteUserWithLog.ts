import { toast } from 'sonner';

import { deletedUsersService } from '@/lib/api/services/deletedUsers';
import { forceLogoutIfDeletedSelf } from '@/lib/auth/deletedUserSession';

interface DeleteUserWithLogOptions {
  email: string;
  roleId: string | undefined;
  reason?: string;
  currentUserEmail: string | undefined | null;
  tenantSlug: string | undefined;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  refresh: () => Promise<unknown>;
}

/** Turns {"error": "text"} or {"error": {"field": ["text"]}} into one readable line. */
export function deleteErrorMessage(error: unknown): string {
  const detail = (error as { data?: { error?: unknown } })?.data?.error;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (detail && typeof detail === 'object') {
    const text = Object.values(detail as Record<string, unknown>).flat().join(' ').trim();
    if (text) return text;
  }
  return error instanceof Error && error.message ? error.message : 'Failed to delete user';
}

/**
 * Deletes through /accounts/delete-user-with-log/ and then does what the existing
 * delete does: sign out if you deleted yourself, otherwise refresh the user list.
 * Returns true when the user was deleted.
 */
export async function deleteUserWithLog({
  email,
  roleId,
  reason,
  currentUserEmail,
  tenantSlug,
  navigate,
  refresh,
}: DeleteUserWithLogOptions): Promise<boolean> {
  if (!roleId) {
    toast.error('User not found');
    return false;
  }
  try {
    await deletedUsersService.deleteWithLog({ email, roleId, reason });
  } catch (error) {
    toast.error(deleteErrorMessage(error));
    return false;
  }

  if (await forceLogoutIfDeletedSelf(email, currentUserEmail)) {
    toast.success('Your account was deleted. You have been signed out.');
    const slug = tenantSlug || window.location.pathname.match(/^\/app\/([^/]+)/)?.[1];
    navigate(slug ? `/app/${slug}/login` : '/auth', { replace: true });
    return true;
  }

  await refresh();
  toast.success('User deleted successfully. They have been signed out everywhere.');
  return true;
}
