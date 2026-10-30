import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../client', () => ({ apiClient: { get } }));

import { rmActivityApi, type RmActivityEventDto } from './rmActivity';

type Params = { from?: string; to?: string; page: number; page_size: number };

const event = (id: number, day: string) => ({ id, event_data: { started_at: `${day}T10:00:00Z` } }) as unknown as RmActivityEventDto;

/** Fake backend: `eventsByDay[day]` rows, served in pages like the real endpoint. */
function serve(eventsByDay: Record<string, RmActivityEventDto[]>) {
  get.mockImplementation(async (_url: string, { params }: { params: Params }) => {
    const days = Object.keys(eventsByDay).filter(
      (day) => (!params.from || day >= params.from) && (!params.to || day <= params.to)
    );
    const all = days.sort().flatMap((day) => eventsByDay[day]);
    const start = (params.page - 1) * params.page_size;
    const data = all.slice(start, start + params.page_size);
    const hasNext = start + params.page_size < all.length;
    return { data: { data, page_meta: { next_page_link: hasNext ? 'next' : null } } };
  });
}

const requestedParams = () => get.mock.calls.map(([, config]) => config.params as Params & Record<string, unknown>);

describe('rmActivityApi.getEvents', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('fetches a multi-day range one day at a time', async () => {
    serve({ '2026-10-01': [event(1, '2026-10-01')], '2026-10-02': [event(2, '2026-10-02')], '2026-10-03': [] });

    await rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-03' });

    const windows = requestedParams().map((p) => `${p.from}..${p.to}`);
    expect(windows.sort()).toEqual(['2026-10-01..2026-10-01', '2026-10-02..2026-10-02', '2026-10-03..2026-10-03']);
  });

  it('returns the same rows as one big window, oldest day first', async () => {
    serve({
      '2026-10-01': [event(1, '2026-10-01'), event(2, '2026-10-01')],
      '2026-10-02': [event(3, '2026-10-02')],
      '2026-10-03': [event(4, '2026-10-03')],
    });

    const rows = await rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-03' });

    expect(rows.map((r) => r.id)).toEqual([1, 2, 3, 4]);
  });

  it('pages within a day and never goes deeper than that day needs', async () => {
    const busyDay = Array.from({ length: 4500 }, (_, i) => event(i + 1, '2026-10-01'));
    serve({ '2026-10-01': busyDay, '2026-10-02': [event(9999, '2026-10-02')] });

    const rows = await rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-02' });

    expect(rows).toHaveLength(4501);
    const busyDayPages = requestedParams()
      .filter((p) => p.from === '2026-10-01')
      .map((p) => p.page);
    expect(busyDayPages).toEqual([1, 2, 3]);
    expect(Math.max(...requestedParams().map((p) => p.page))).toBe(3);
  });

  it('runs at most 3 days in parallel', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    get.mockImplementation(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return { data: { data: [], page_meta: { next_page_link: null } } };
    });

    await rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-10' });

    expect(get).toHaveBeenCalledTimes(10);
    expect(maxInFlight).toBe(3);
  });

  it('keeps rm_user_id and manager_user_id on every day request', async () => {
    serve({});

    await rmActivityApi.getEvents({ from: '2026-10-01', to: '2026-10-02', rmUserId: 'rm-1', managerUserId: 'mgr-1' });

    for (const params of requestedParams()) {
      expect(params).toMatchObject({ rm_user_id: 'rm-1', manager_user_id: 'mgr-1', page_size: 2000, include_count: false });
    }
  });

  it('sends a single-day range as one request, unchanged', async () => {
    serve({ '2026-10-28': [event(1, '2026-10-28')] });

    await rmActivityApi.getEvents({ from: '2026-10-28', to: '2026-10-28', rmUserId: 'rm-1' });

    expect(requestedParams()).toEqual([
      expect.objectContaining({ from: '2026-10-28', to: '2026-10-28', rm_user_id: 'rm-1', page: 1 }),
    ]);
  });

  it('sends ranges it cannot split as-is (no dates → backend default of today)', async () => {
    serve({});

    await rmActivityApi.getEvents();

    expect(get).toHaveBeenCalledTimes(1);
    expect(requestedParams()[0]).toMatchObject({ from: undefined, to: undefined, page: 1 });
  });

  it('stops paging on an empty page even if next_page_link is set', async () => {
    get.mockResolvedValue({ data: { data: [], page_meta: { next_page_link: 'next' } } });

    await rmActivityApi.getEvents({ from: '2026-10-28', to: '2026-10-28' });

    expect(get).toHaveBeenCalledTimes(1);
  });
});
