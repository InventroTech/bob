import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../client', () => ({ apiClient: { get } }));

import { clearRmActivityCache, rmActivityApi, type RmActivityEventDto } from './rmActivity';

const event = (id: number, day: string) => ({ id, event_data: { started_at: `${day}T10:00:00Z` } }) as unknown as RmActivityEventDto;

function serveOnce(rows: RmActivityEventDto[]) {
  get.mockImplementationOnce(async () => ({
    data: { data: rows, page_meta: { next_page_link: null } },
  }));
}

describe('rmActivityApi.getEvents request cache', () => {
  beforeEach(() => {
    get.mockReset();
    clearRmActivityCache();
  });

  it('a second call with the exact same params within the TTL does not hit the network again', async () => {
    serveOnce([event(1, '2026-10-01')]);

    const first = await rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-01' });
    const second = await rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-01' });

    expect(get).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('different params are a cache miss, not served from another call\'s cache', async () => {
    serveOnce([event(1, '2026-10-01')]);
    serveOnce([event(2, '2026-10-02')]);

    await rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-01' });
    await rmActivityApi.getEvents({ from: '2026-10-02', to: '2026-10-02' });

    expect(get).toHaveBeenCalledTimes(2);
  });

  it('two concurrent identical calls collapse into one real request', async () => {
    serveOnce([event(1, '2026-10-01')]);

    const [a, b] = await Promise.all([
      rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-01' }),
      rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-01' }),
    ]);

    expect(get).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });

  it('clearRmActivityCache forces the next call to actually refetch', async () => {
    serveOnce([event(1, '2026-10-01')]);
    serveOnce([event(2, '2026-10-01')]);

    await rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-01' });
    clearRmActivityCache();
    await rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-01' });

    expect(get).toHaveBeenCalledTimes(2);
  });

  it('a failed call does not poison the cache — the next call gets a real retry', async () => {
    get.mockImplementationOnce(async () => {
      throw new Error('network error');
    });
    serveOnce([event(1, '2026-10-01')]);

    await expect(rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-01' })).rejects.toThrow('network error');
    const result = await rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-01' });

    expect(get).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
  });
});
