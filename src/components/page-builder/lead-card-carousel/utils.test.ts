import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/api/services/crmLeads', () => ({
  crmLeadsApi: { sendLeadEvent: vi.fn().mockResolvedValue(true) },
}));

import { markLeadOpened, clearLeadStartTime, getOrCreateLeadStartTime } from './utils';

describe('lead-card-carousel display-timer storage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reopening the same lead id reuses the stored start time (survives a refresh)', () => {
    const first = getOrCreateLeadStartTime('101', 'All Leads');
    vi.advanceTimersByTime(5000);
    const second = getOrCreateLeadStartTime('101', 'All Leads');
    expect(second.getTime()).toBe(first.getTime());
  });

  it('a different lead id gets its own fresh start time', () => {
    const first = getOrCreateLeadStartTime('101', 'All Leads');
    vi.advanceTimersByTime(5000);
    const second = getOrCreateLeadStartTime('202', 'All Leads');
    expect(second.getTime()).not.toBe(first.getTime());
  });

  it('clearLeadStartTime for the right id lets a later visit start fresh', () => {
    const first = markLeadOpened('101', 'All Leads');
    clearLeadStartTime('101');

    vi.advanceTimersByTime(5000);
    const second = getOrCreateLeadStartTime('101', 'All Leads');

    expect(second.getTime()).not.toBe(first.getTime());
  });

  it('clearLeadStartTime for the wrong id does not disturb the real one', () => {
    const first = markLeadOpened('101', 'All Leads');
    clearLeadStartTime('999');

    const second = getOrCreateLeadStartTime('101', 'All Leads');

    expect(second.getTime()).toBe(first.getTime());
  });

  it('an old stored start time does not survive past the staleness window', () => {
    const first = getOrCreateLeadStartTime('101', 'All Leads');
    vi.advanceTimersByTime(13 * 60 * 60 * 1000); // past the 12h window
    const second = getOrCreateLeadStartTime('101', 'All Leads');
    expect(second.getTime()).not.toBe(first.getTime());
  });

  it('markLeadOpened only fires lead.opened once per genuinely new open', async () => {
    const { crmLeadsApi } = await import('@/lib/api/services/crmLeads');
    markLeadOpened('101', 'All Leads');
    markLeadOpened('101', 'All Leads');
    markLeadOpened('101', 'All Leads');
    expect(vi.mocked(crmLeadsApi.sendLeadEvent)).toHaveBeenCalledTimes(1);
  });
});
