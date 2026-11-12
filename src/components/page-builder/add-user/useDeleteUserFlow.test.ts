import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';

import type { User } from './types';
import { useDeleteUserFlow } from './useDeleteUserFlow';

const deleteUserWithLog = vi.fn();

vi.mock('./deleteUserWithLog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./deleteUserWithLog')>()),
  deleteUserWithLog: (...args: unknown[]) => deleteUserWithLog(...args),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const user = (overrides: Partial<User> = {}): User => ({
  uid: 'uid-asha',
  name: 'Asha Rao',
  email: 'asha@praja.in',
  role_id: 'role-rm',
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const asha = user();
const ravi = user({ uid: 'uid-ravi', name: 'Ravi K', email: 'ravi@praja.in', role_id: 'role-gm' });

const setup = (users: User[] = [asha, ravi]) => {
  const navigate = vi.fn();
  const refresh = vi.fn().mockResolvedValue(undefined);
  const hook = renderHook(() =>
    useDeleteUserFlow({
      users,
      currentUserEmail: 'admin@praja.in',
      tenantSlug: 'praja',
      navigate,
      refresh,
    })
  );
  return { ...hook, navigate, refresh };
};

beforeEach(() => {
  deleteUserWithLog.mockReset().mockResolvedValue(true);
  vi.mocked(toast.error).mockReset();
});

describe('useDeleteUserFlow', () => {
  it('starts with nobody being deleted', () => {
    const { result } = setup();

    expect(result.current.deletingEmail).toBeNull();
  });

  it('deletes straight away, without asking for confirmation', async () => {
    const { result, navigate, refresh } = setup();

    await act(() => result.current.deleteUser(ravi));

    expect(deleteUserWithLog).toHaveBeenCalledTimes(1);
    expect(deleteUserWithLog).toHaveBeenCalledWith({
      email: 'ravi@praja.in',
      roleId: 'role-gm',
      currentUserEmail: 'admin@praja.in',
      tenantSlug: 'praja',
      navigate,
      refresh,
    });
    expect(deleteUserWithLog.mock.calls[0][0]).not.toHaveProperty('reason');
  });

  it('looks up the role from the users list when the row has none', async () => {
    const { result } = setup([asha, ravi]);

    await act(() => result.current.deleteUser(user({ email: 'ravi@praja.in', role_id: '' })));

    expect(deleteUserWithLog.mock.calls[0][0].roleId).toBe('role-gm');
  });

  it('marks the user as being deleted until the delete finishes', async () => {
    let finish: (ok: boolean) => void = () => {};
    deleteUserWithLog.mockReturnValue(new Promise<boolean>((resolve) => { finish = resolve; }));
    const { result } = setup();

    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = result.current.deleteUser(asha); });
    await waitFor(() => expect(result.current.deletingEmail).toBe('asha@praja.in'));

    await act(async () => { finish(true); await pending; });
    expect(result.current.deletingEmail).toBeNull();
  });

  it('ignores a second click while a delete is still running', async () => {
    let finish: (ok: boolean) => void = () => {};
    deleteUserWithLog.mockReturnValue(new Promise<boolean>((resolve) => { finish = resolve; }));
    const { result } = setup();

    let first: Promise<void> = Promise.resolve();
    act(() => { first = result.current.deleteUser(asha); });
    await act(() => result.current.deleteUser(ravi));
    await act(() => result.current.deleteUser(asha));

    expect(deleteUserWithLog).toHaveBeenCalledTimes(1);
    await act(async () => { finish(true); await first; });
  });

  it('can delete another user once the first delete is done', async () => {
    const { result } = setup();

    await act(() => result.current.deleteUser(asha));
    await act(() => result.current.deleteUser(ravi));

    expect(deleteUserWithLog).toHaveBeenCalledTimes(2);
    expect(deleteUserWithLog.mock.calls[1][0].email).toBe('ravi@praja.in');
  });

  it('clears the deleting state when the delete fails', async () => {
    deleteUserWithLog.mockResolvedValue(false);
    const { result } = setup();

    await act(() => result.current.deleteUser(asha));

    expect(result.current.deletingEmail).toBeNull();
  });

  it('shows an error and clears the deleting state if something throws', async () => {
    deleteUserWithLog.mockRejectedValue(new Error('network'));
    const { result } = setup();

    await act(() => result.current.deleteUser(asha));

    expect(toast.error).toHaveBeenCalledWith('network');
    expect(result.current.deletingEmail).toBeNull();
    await act(() => {
      deleteUserWithLog.mockResolvedValue(true);
      return result.current.deleteUser(ravi);
    });
    expect(deleteUserWithLog).toHaveBeenCalledTimes(2);
  });
});
