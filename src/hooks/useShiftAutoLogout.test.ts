import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useShiftAutoLogout } from './useShiftAutoLogout';
import { rmActivityApi } from '@/lib/api/services/rmActivity';
import { setLeadCallActive } from '@/lib/realtime/shiftCallActivityBus';

const logout = vi.fn().mockResolvedValue(undefined);
// hoisted and stable across renders — like the real Supabase session, these
// must keep the same object identity between renders (React effect deps
// compare by reference); recreating them inline on every useAuth() call
// would tear down and restart the hook's effect on every single render,
// including internal setState renders, before any timer gets a chance to fire
const mockUser = { id: 'rm-1' };
const mockSession = { access_token: 'x' };

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    session: mockSession,
    logout,
  }),
}));

let mockRole = 'RM';
vi.mock('@/hooks/useTenant', () => ({
  useTenant: () => ({
    customRole: mockRole,
    tenantSlug: 'praja',
    membershipLoaded: true,
  }),
}));

vi.mock('@/lib/api/services/rmActivity', () => ({
  rmActivityApi: { getEvents: vi.fn() },
}));

const getEvents = vi.mocked(rmActivityApi.getEvents);

const storageKeyFor = (dateStr: string) => `shiftAutoLogout.praja.rm-1.${dateStr}`;

const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

describe('useShiftAutoLogout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockRole = 'RM';
    logout.mockClear();
    getEvents.mockReset();
    window.localStorage.clear();
    setLeadCallActive(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defers the shift-ended notice until an active call ends, instead of interrupting it', async () => {
    const now = Date.now();
    // shift clock already elapsed — enforcement is due immediately
    window.localStorage.setItem(storageKeyFor(todayKey()), String(now - 1000));
    setLeadCallActive(true);

    const { result, rerender } = renderHook(() => useShiftAutoLogout());
    await vi.advanceTimersByTimeAsync(0);
    rerender();

    // must not show the overlay or log out while a call is active
    expect(result.current.showShiftEndedOverlay).toBe(false);
    expect(logout).not.toHaveBeenCalled();

    setLeadCallActive(false);
    await vi.advanceTimersByTimeAsync(3000);
    rerender();

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('re-enforces 1 hour later (not another 9 hours) once the shift has already ended today', async () => {
    const now = Date.now();
    window.localStorage.setItem(storageKeyFor(todayKey()), String(now - 1000));

    renderHook(() => useShiftAutoLogout());
    await vi.advanceTimersByTimeAsync(3000); // overlay's 3s delay elapses -> logout fires

    expect(logout).toHaveBeenCalledTimes(1);
    const stored = Number(window.localStorage.getItem(storageKeyFor(todayKey())));
    expect(stored).toBeGreaterThanOrEqual(now + 60 * 60 * 1000 - 1000);
    expect(stored).toBeLessThan(now + 60 * 60 * 1000 + 5000);
  });

  it('does nothing for non-RM roles (no polling, no scheduling)', async () => {
    mockRole = 'MANAGER';
    renderHook(() => useShiftAutoLogout());
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(getEvents).not.toHaveBeenCalled();
  });

  it('schedules 9 hours after the first lead touch of the day when nothing is stored yet', async () => {
    const startedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString().replace('Z', '');
    getEvents.mockResolvedValue([
      { id: 1, event_type: 'CALL_TOUCH', event_data: { started_at: startedAt } } as any,
    ]);

    renderHook(() => useShiftAutoLogout());
    await vi.advanceTimersByTimeAsync(0);

    expect(getEvents).toHaveBeenCalledWith(
      expect.objectContaining({ rmUserId: 'rm-1' })
    );
    const stored = Number(window.localStorage.getItem(storageKeyFor(todayKey())));
    const expected = new Date(`${startedAt}Z`).getTime() + 9 * 60 * 60 * 1000;
    expect(stored).toBe(expected);
  });
});
