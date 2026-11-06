import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { deleteErrorMessage, deleteUserWithLog } from './deleteUserWithLog';
import type { User } from './types';

interface UseDeleteUserFlowOptions {
  users: User[];
  currentUserEmail: string | undefined | null;
  tenantSlug: string | undefined;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  refresh: () => Promise<unknown>;
}

/** Deletes a user straight from the trash button (no confirmation) and tracks who is being deleted. */
export function useDeleteUserFlow({ users, currentUserEmail, tenantSlug, navigate, refresh }: UseDeleteUserFlowOptions) {
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const inFlight = useRef(false);

  const deleteUser = async (user: User) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setDeletingEmail(user.email);
    try {
      await deleteUserWithLog({
        email: user.email,
        roleId: user.role_id || users.find((u) => u.email === user.email)?.role_id,
        currentUserEmail,
        tenantSlug,
        navigate,
        refresh,
      });
    } catch (error) {
      toast.error(deleteErrorMessage(error));
    } finally {
      inFlight.current = false;
      setDeletingEmail(null);
    }
  };

  return { deletingEmail, deleteUser };
}
