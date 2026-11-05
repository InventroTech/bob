import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRmActivityEvents } from './useRmActivityEvents';
import { rmActivityApi } from '@/lib/api/services/rmActivity';

vi.mock('@/lib/api/services/rmActivity', () => ({
  rmActivityApi: { getEvents: vi.fn(), getEventsAbortable: vi.fn() },
}));

const getEvents = vi.mocked(rmActivityApi.getEventsAbortable);

describe('useRmActivityEvents refreshToken', () => {
  beforeEach(() => {
    getEvents.mockReset();
    getEvents.mockResolvedValue([]);
  });

  it('does not refetch on its own when bounds/rmUserId are unchanged', async () => {
    const bounds = { from: 0, to: 1000 };
    const { rerender } = renderHook(
      ({ token }: { token: number }) => useRmActivityEvents(bounds, 'rm-1', token),
      { initialProps: { token: 0 } }
    );
    await waitFor(() => expect(getEvents).toHaveBeenCalledTimes(1));

    rerender({ token: 0 });
    // same token, same bounds, same rmUserId — a plain re-render must not
    // trigger a second network call
    await new Promise((r) => setTimeout(r, 0));
    expect(getEvents).toHaveBeenCalledTimes(1);
  });

  it('refetches when refreshToken changes even though bounds/rmUserId stay identical', async () => {
    // this is the mechanism that fixes the "Your Shift" panel freezing at
    // mount: bounds are date-granularity ("today"'s date string is the same
    // all day), so without a bumping refreshToken there is no other way to
    // make this hook pull fresh data later in the shift
    const bounds = { from: 0, to: 1000 };
    const { rerender } = renderHook(
      ({ token }: { token: number }) => useRmActivityEvents(bounds, 'rm-1', token),
      { initialProps: { token: 0 } }
    );
    await waitFor(() => expect(getEvents).toHaveBeenCalledTimes(1));

    rerender({ token: 1 });
    await waitFor(() => expect(getEvents).toHaveBeenCalledTimes(2));
  });

  it('aborts the previous request instead of leaving it running when filters change fast', async () => {
    const signals: AbortSignal[] = [];
    getEvents.mockImplementation((_params, signal) => {
      signals.push(signal);
      return new Promise(() => {}); // never resolves — only the abort matters here
    });

    const DAY_MS = 24 * 60 * 60 * 1000;
    const { rerender } = renderHook(
      ({ from }: { from: number }) => useRmActivityEvents({ from, to: from + DAY_MS }, 'rm-1'),
      { initialProps: { from: 0 } }
    );
    await waitFor(() => expect(getEvents).toHaveBeenCalledTimes(1));
    expect(signals[0].aborted).toBe(false);

    // a fast filter change (different day) must abort the stale request's
    // signal, not just let it keep running in the background unused
    rerender({ from: 10 * DAY_MS });
    await waitFor(() => expect(getEvents).toHaveBeenCalledTimes(2));
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });
});
