import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { User } from './types';
import { useDeleteUserFlow } from './useDeleteUserFlow';

const deleteUserWithLog = vi.fn();

vi.mock('./deleteUserWithLog', () => ({
  deleteUserWithLog: (...args: unknown[]) => deleteUserWithLog(...args),
}));

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
});

describe('useDeleteUserFlow', () => {
  it('starts with nobody waiting to be deleted', () => {
    const { result } = setup();

    expect(result.current.pendingDelete).toBeNull();
    expect(result.current.deletedRefreshKey).toBe(0);
  });

  it('remembers the user whose delete button was pressed', () => {
    const { result } = setup();

    act(() => result.current.requestDelete(ravi));

    expect(result.current.pendingDelete).toEqual({ email: 'ravi@praja.in', uid: 'uid-ravi', name: 'Ravi K' });
  });

  it('forgets the user when the dialog is cancelled', () => {
    const { result } = setup();
    act(() => result.current.requestDelete(asha));

    act(() => result.current.cancelDelete());

    expect(result.current.pendingDelete).toBeNull();
    expect(deleteUserWithLog).not.toHaveBeenCalled();
  });

  it("deletes with the user's role from the list, the reason and the page context", async () => {
    const { result, navigate, refresh } = setup();
    act(() => result.current.requestDelete(ravi));

    await act(() => result.current.confirmDelete('Left the company'));

    expect(deleteUserWithLog).toHaveBeenCalledWith({
      email: 'ravi@praja.in',
      roleId: 'role-gm',
      reason: 'Left the company',
      currentUserEmail: 'admin@praja.in',
      tenantSlug: 'praja',
      navigate,
      refresh,
    });
  });

  it('deletes without a reason', async () => {
    const { result } = setup();
    act(() => result.current.requestDelete(asha));

    await act(() => result.current.confirmDelete(undefined));

    expect(deleteUserWithLog).toHaveBeenCalledWith(expect.objectContaining({ email: 'asha@praja.in', reason: undefined }));
  });

  it('closes the dialog and reloads the deleted list after a successful delete', async () => {
    const { result } = setup();
    act(() => result.current.requestDelete(asha));

    await act(() => result.current.confirmDelete('Left'));

    expect(result.current.pendingDelete).toBeNull();
    expect(result.current.deletedRefreshKey).toBe(1);
  });

  it('bumps the refresh key once per successful delete', async () => {
    const { result } = setup();

    for (const person of [asha, ravi]) {
      act(() => result.current.requestDelete(person));
      await act(() => result.current.confirmDelete(undefined));
    }

    expect(result.current.deletedRefreshKey).toBe(2);
  });

  it('keeps the dialog open and the list as it was when the delete fails', async () => {
    deleteUserWithLog.mockResolvedValue(false);
    const { result } = setup();
    act(() => result.current.requestDelete(asha));

    await act(() => result.current.confirmDelete('Left'));

    expect(result.current.pendingDelete).toEqual({ email: 'asha@praja.in', uid: 'uid-asha', name: 'Asha Rao' });
    expect(result.current.deletedRefreshKey).toBe(0);
  });

  it('does nothing when confirm is pressed with nobody selected', async () => {
    const { result } = setup();

    await act(() => result.current.confirmDelete('Left'));

    expect(deleteUserWithLog).not.toHaveBeenCalled();
    expect(result.current.deletedRefreshKey).toBe(0);
  });

  it('sends no role when the user is no longer in the list', async () => {
    const { result } = setup([ravi]);
    act(() => result.current.requestDelete(asha));

    await act(() => result.current.confirmDelete(undefined));

    expect(deleteUserWithLog).toHaveBeenCalledWith(expect.objectContaining({ email: 'asha@praja.in', roleId: undefined }));
  });
});
