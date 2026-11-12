import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';

import { deleteErrorMessage, deleteUserWithLog } from './deleteUserWithLog';

const deleteWithLog = vi.fn();
const forceLogoutIfDeletedSelf = vi.fn();

vi.mock('@/lib/api/services/deletedUsers', () => ({
  deletedUsersService: { deleteWithLog: (...args: unknown[]) => deleteWithLog(...args) },
}));
vi.mock('@/lib/auth/deletedUserSession', () => ({
  forceLogoutIfDeletedSelf: (...args: unknown[]) => forceLogoutIfDeletedSelf(...args),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const setup = (overrides: Partial<Parameters<typeof deleteUserWithLog>[0]> = {}) => {
  const navigate = vi.fn();
  const refresh = vi.fn().mockResolvedValue(undefined);
  const run = () =>
    deleteUserWithLog({
      email: 'rm@praja.in',
      roleId: 'role-1',
      currentUserEmail: 'admin@praja.in',
      tenantSlug: 'praja',
      navigate,
      refresh,
      ...overrides,
    });
  return { run, navigate, refresh };
};

beforeEach(() => {
  deleteWithLog.mockReset().mockResolvedValue(undefined);
  forceLogoutIfDeletedSelf.mockReset().mockResolvedValue(false);
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe('deleteUserWithLog', () => {
  it('sends the email and role to the log endpoint', async () => {
    const { run } = setup();

    await run();

    expect(deleteWithLog).toHaveBeenCalledWith({ email: 'rm@praja.in', roleId: 'role-1' });
  });

  it('refreshes the user list and says it worked', async () => {
    const { run, refresh, navigate } = setup();

    await expect(run()).resolves.toBe(true);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('User deleted successfully. They have been signed out everywhere.');
  });

  it('signs you out and goes to login when you delete yourself', async () => {
    forceLogoutIfDeletedSelf.mockResolvedValue(true);
    const { run, refresh, navigate } = setup({ email: 'admin@praja.in' });

    await expect(run()).resolves.toBe(true);

    expect(forceLogoutIfDeletedSelf).toHaveBeenCalledWith('admin@praja.in', 'admin@praja.in');
    expect(navigate).toHaveBeenCalledWith('/app/praja/login', { replace: true });
    expect(refresh).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Your account was deleted. You have been signed out.');
  });

  it('goes to /auth when the tenant is unknown after deleting yourself', async () => {
    forceLogoutIfDeletedSelf.mockResolvedValue(true);
    const { run, navigate } = setup({ tenantSlug: undefined });

    await run();

    expect(navigate).toHaveBeenCalledWith('/auth', { replace: true });
  });

  it('does nothing when the user role is unknown', async () => {
    const { run, refresh } = setup({ roleId: undefined });

    await expect(run()).resolves.toBe(false);

    expect(deleteWithLog).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('User not found');
  });

  it('shows the server error and keeps the list when the delete fails', async () => {
    deleteWithLog.mockRejectedValue(Object.assign(new Error('Bad request'), { data: { error: 'Tenant not resolved' } }));
    const { run, refresh } = setup();

    await expect(run()).resolves.toBe(false);

    expect(toast.error).toHaveBeenCalledWith('Tenant not resolved');
    expect(refresh).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('deleteErrorMessage', () => {
  it('uses a plain error text from the server', () => {
    expect(deleteErrorMessage({ data: { error: 'Internal server error' } })).toBe('Internal server error');
  });

  it('joins field errors from the server', () => {
    expect(
      deleteErrorMessage({ data: { error: { email: ['Enter a valid email address.'] } } })
    ).toBe('Enter a valid email address.');
  });

  it('falls back to the error message', () => {
    expect(deleteErrorMessage(new Error('Network Error'))).toBe('Network Error');
  });

  it('falls back to a generic message', () => {
    expect(deleteErrorMessage({})).toBe('Failed to delete user');
    expect(deleteErrorMessage({ data: { error: '   ' } })).toBe('Failed to delete user');
  });
});
