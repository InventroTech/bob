import { useState } from 'react';

import type { PendingDelete } from './DeleteUserDialog';
import { deleteUserWithLog } from './deleteUserWithLog';
import type { User } from './types';

interface UseDeleteUserFlowOptions {
  users: User[];
  currentUserEmail: string | undefined | null;
  tenantSlug: string | undefined;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  refresh: () => Promise<unknown>;
}

/** Delete-user state for the users table: which user is being deleted and the deleted-list refresh key. */
export function useDeleteUserFlow({ users, currentUserEmail, tenantSlug, navigate, refresh }: UseDeleteUserFlowOptions) {
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deletedRefreshKey, setDeletedRefreshKey] = useState(0);

  const requestDelete = (user: User) =>
    setPendingDelete({ email: user.email, uid: user.uid, name: user.name });

  const cancelDelete = () => setPendingDelete(null);

  const confirmDelete = async (reason: string | undefined) => {
    if (!pendingDelete) return;
    const deleted = await deleteUserWithLog({
      email: pendingDelete.email,
      roleId: users.find((u) => u.email === pendingDelete.email)?.role_id,
      reason,
      currentUserEmail,
      tenantSlug,
      navigate,
      refresh,
    });
    if (deleted) {
      setPendingDelete(null);
      setDeletedRefreshKey((key) => key + 1);
    }
  };

  return { pendingDelete, deletedRefreshKey, requestDelete, cancelDelete, confirmDelete };
}
