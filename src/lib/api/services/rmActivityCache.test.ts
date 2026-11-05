import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../client', () => ({ apiClient: { get } }));

import { clearRmActivityCache, rmActivityApi } from './rmActivity';

describe('rmActivityApi request cache', () => {
  beforeEach(() => {
    get.mockReset();
    clearRmActivityCache();
  });

  it('serves a repeat getEvents call with identical params from cache, not the network', async () => {
    get.mockResolvedValue({ data: { data: [], page_meta: { next_page_link: null } } });

    await rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-01' });
    await rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-01' });

    expect(get).toHaveBeenCalledTimes(1);
  });

  it('a different param set is a real cache miss, not served from an unrelated entry', async () => {
    get.mockResolvedValue({ data: { data: [], page_meta: { next_page_link: null } } });

    await rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-01', rmUserId: 'rm-1' });
    await rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-01', rmUserId: 'rm-2' });

    expect(get).toHaveBeenCalledTimes(2);
  });

  it('concurrent identical calls collapse into a single in-flight request', async () => {
    let resolveFetch: (value: unknown) => void;
    get.mockReturnValue(new Promise((resolve) => { resolveFetch = resolve; }));

    const first = rmActivityApi.getFilterOptions();
    const second = rmActivityApi.getFilterOptions();
    resolveFetch!({ data: { managers: [], lead_groups: [], states: [], parties: [] } });
    await Promise.all([first, second]);

    expect(get).toHaveBeenCalledTimes(1);
  });

  it('clearRmActivityCache forces the next call to hit the network again', async () => {
    get.mockResolvedValue({ data: { from: '2026-10-01', to: '2026-10-01' } });

    await rmActivityApi.getDailyTargets({ from: '2026-10-01', to: '2026-10-01' });
    clearRmActivityCache();
    await rmActivityApi.getDailyTargets({ from: '2026-10-01', to: '2026-10-01' });

    expect(get).toHaveBeenCalledTimes(2);
  });

  it('a failed call is not cached — the next identical call retries the network', async () => {
    get.mockRejectedValueOnce(new Error('network down'));
    get.mockResolvedValueOnce({ data: { data: [], page_meta: { next_page_link: null } } });

    await expect(rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-01' })).rejects.toThrow('network down');
    await expect(rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-01' })).resolves.toEqual([]);

    expect(get).toHaveBeenCalledTimes(2);
  });

  it('getActiveSessions is never cached — every call is a real request', async () => {
    get.mockResolvedValue({ data: [] });

    await rmActivityApi.getActiveSessions({ rmUserId: 'rm-1' });
    await rmActivityApi.getActiveSessions({ rmUserId: 'rm-1' });

    expect(get).toHaveBeenCalledTimes(2);
  });
});
