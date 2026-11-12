import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAddUser } from './useAddUser';
import { leadTypeAssignmentApi } from '@/lib/api/services/userSettings';

const auth = { user: { id: 'user-1' }, session: { access_token: 'token' } };
const tenant = { tenantId: 'tenant-1', tenantSlug: 'praja' };

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/useTenant', () => ({ useTenant: () => tenant }));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    membershipService: {
      ...actual.membershipService,
      getRoles: vi.fn().mockResolvedValue([]),
      getMyMembership: vi.fn().mockResolvedValue(null),
    },
  };
});
vi.mock('@/lib/api/services/userSettings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/services/userSettings')>();
  return {
    ...actual,
    leadTypeAssignmentApi: {
      ...actual.leadTypeAssignmentApi,
      getCoreKVSettingsForMembers: vi.fn(),
      getUserCoreKVSettings: vi.fn(),
      getAvailableQueueTypes: vi.fn().mockResolvedValue([]),
      getGeoPartyCatalog: vi.fn().mockResolvedValue({ states: [], districts: [], parties: [] }),
    },
    groupsApi: { ...actual.groupsApi, getAll: vi.fn().mockResolvedValue([]) },
  };
});

const getAll = vi.mocked(leadTypeAssignmentApi.getCoreKVSettingsForMembers);
const getOne = vi.mocked(leadTypeAssignmentApi.getUserCoreKVSettings);

const kvRow = (membership: number, key: string, value: unknown) => ({
  id: membership * 100 + key.length,
  tenant: 'tenant-1',
  tenant_membership: membership,
  key,
  value,
  created_at: '2026-11-10T00:00:00Z',
  updated_at: '2026-11-10T00:00:00Z',
});

const wrapper = ({ children }: { children: React.ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;

const dailyTargetOf = (result: { current: ReturnType<typeof useAddUser> }, email: string) =>
  result.current.usersWithSettings.find((u) => u.email === email)?.dailyTarget;

describe('useAddUser core settings loading', () => {
  beforeEach(() => {
    getAll.mockReset();
    getOne.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              count: 2,
              results: [
                { id: 67, email: 'asha@example.com', name: 'Asha', role: { id: 'r-rm', name: 'RM' } },
                { id: 68, email: 'ravi@example.com', name: 'Ravi', role: { id: 'r-rm', name: 'RM' } },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads every user’s settings through the batch loader, not one request per user', async () => {
    getAll.mockResolvedValue({
      '67': [{ key: 'DAILY_TARGET', value: 10 }],
      '68': [{ key: 'DAILY_TARGET', value: 25 }],
    });

    const { result } = renderHook(() => useAddUser({ config: {} }), { wrapper });

    await waitFor(() => expect(dailyTargetOf(result, 'ravi@example.com')).toBe(25));
    expect(dailyTargetOf(result, 'asha@example.com')).toBe(10);
    expect(getAll).toHaveBeenCalledWith([67, 68]);
    expect(getOne).not.toHaveBeenCalled();
  });

  it('falls back to per-user requests when the bulk endpoint is not available', async () => {
    getAll.mockResolvedValue(null);
    getOne.mockImplementation(async (membershipId: string) => [
      kvRow(Number(membershipId), 'DAILY_TARGET', membershipId === '67' ? 10 : 25),
    ]);

    const { result } = renderHook(() => useAddUser({ config: {} }), { wrapper });

    await waitFor(() => expect(dailyTargetOf(result, 'ravi@example.com')).toBe(25));
    expect(dailyTargetOf(result, 'asha@example.com')).toBe(10);
    expect(getOne).toHaveBeenCalledTimes(2);
  });
});
