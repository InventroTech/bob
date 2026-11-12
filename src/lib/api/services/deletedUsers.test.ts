import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, del } = vi.hoisted(() => ({ get: vi.fn(), del: vi.fn() }));
vi.mock('../client', () => ({ apiClient: { get, delete: del } }));

import { deletedUsersService } from './deletedUsers';

beforeEach(() => {
  get.mockReset();
  del.mockReset().mockResolvedValue({ data: { success: true } });
});

describe('deletedUsersService.list', () => {
  it('reads the deleted-users endpoint', async () => {
    get.mockResolvedValue({ data: { count: 1, results: [{ id: 'log-1', email: 'a@praja.in' }] } });

    const rows = await deletedUsersService.list();

    expect(get).toHaveBeenCalledWith('/accounts/deleted-users/');
    expect(rows).toEqual([{ id: 'log-1', email: 'a@praja.in' }]);
  });

  it('returns an empty list for an unexpected response', async () => {
    get.mockResolvedValue({ data: {} });

    expect(await deletedUsersService.list()).toEqual([]);
  });
});

describe('deletedUsersService.deleteWithLog', () => {
  it('calls the new endpoint with only the email and role', async () => {
    await deletedUsersService.deleteWithLog({ email: 'rm@praja.in', roleId: 'role-1' });

    expect(del).toHaveBeenCalledWith('/accounts/delete-user-with-log/', {
      data: { email: 'rm@praja.in', role_id: 'role-1' },
    });
    expect(del.mock.calls[0][1].data).not.toHaveProperty('reason');
  });

  it('never calls the old delete endpoint', async () => {
    await deletedUsersService.deleteWithLog({ email: 'rm@praja.in', roleId: 'role-1' });

    expect(del.mock.calls[0][0]).not.toBe('/accounts/delete-user/');
  });

  it('passes errors on to the caller', async () => {
    del.mockRejectedValue(new Error('Network Error'));

    await expect(deletedUsersService.deleteWithLog({ email: 'rm@praja.in', roleId: 'role-1' })).rejects.toThrow(
      'Network Error'
    );
  });
});
