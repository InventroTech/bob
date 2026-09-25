import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRmDailyTargets } from './useRmDailyTargets';
import { rmActivityApi } from '@/lib/api/services/rmActivity';

vi.mock('@/lib/api/services/rmActivity', () => ({
  rmActivityApi: { getDailyTargets: vi.fn() },
}));

const getDailyTargets = vi.mocked(rmActivityApi.getDailyTargets);

describe('useRmDailyTargets refreshToken', () => {
  beforeEach(() => {
    getDailyTargets.mockReset();
    getDailyTargets.mockResolvedValue({});
  });

  it('does not refetch on its own when bounds are unchanged', async () => {
    const bounds = { from: 0, to: 1000 };
    const { rerender } = renderHook(
      ({ token }: { token: number }) => useRmDailyTargets(bounds, token),
      { initialProps: { token: 0 } }
    );
    await waitFor(() => expect(getDailyTargets).toHaveBeenCalledTimes(1));

    rerender({ token: 0 });
    await new Promise((r) => setTimeout(r, 0));
    expect(getDailyTargets).toHaveBeenCalledTimes(1);
  });

  it('refetches when refreshToken changes even though bounds stay identical', async () => {
    // this is what keeps the RM PRD dashboard from going stale between
    // manual page reloads — e.g. a manager editing a target elsewhere
    // (User Settings) needs an already-open dashboard to eventually pick it up
    const bounds = { from: 0, to: 1000 };
    const { rerender } = renderHook(
      ({ token }: { token: number }) => useRmDailyTargets(bounds, token),
      { initialProps: { token: 0 } }
    );
    await waitFor(() => expect(getDailyTargets).toHaveBeenCalledTimes(1));

    rerender({ token: 1 });
    await waitFor(() => expect(getDailyTargets).toHaveBeenCalledTimes(2));
  });
});
