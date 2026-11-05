import { apiClient } from '../client';

/** A removed user from GET /accounts/deleted-users/ (newest first). */
export interface DeletedUser {
  /** "log-<n>" for logged deletions, "membership-<n>" for users deleted before the log existed. */
  id: string;
  name: string;
  email: string;
  role_id: string | null;
  role_name: string | null;
  manager_name: string | null;
  manager_email: string | null;
  created_at: string | null;
  deleted_at: string | null;
  /** Null for users deleted before deletions were logged. */
  deleted_by: string | null;
  deletion_reason: string | null;
}

export interface DeleteUserWithLogInput {
  email: string;
  roleId: string;
  reason?: string;
}

export const deletedUsersService = {
  async list(): Promise<DeletedUser[]> {
    const response = await apiClient.get<{ count: number; results: DeletedUser[] }>('/accounts/deleted-users/');
    return Array.isArray(response.data?.results) ? response.data.results : [];
  },

  /** Same delete as /accounts/delete-user/, plus a log row with who, when and the optional reason. */
  async deleteWithLog({ email, roleId, reason }: DeleteUserWithLogInput): Promise<void> {
    const trimmed = reason?.trim();
    await apiClient.delete('/accounts/delete-user-with-log/', {
      data: { email, role_id: roleId, ...(trimmed ? { reason: trimmed } : {}) },
    });
  },
};
