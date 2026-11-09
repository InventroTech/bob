import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TicketTableComponent } from './index';

const tenant = { customRole: null as string | null, membershipLoaded: true };
const auth = { session: { access_token: 'token' }, user: { id: 'user-1' } };

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => auth,
}));
vi.mock('@/hooks/useTenant', () => ({
  useTenant: () => tenant,
}));
vi.mock('@/hooks/useRecordUpdated', () => ({
  REALTIME_LIST_DEBOUNCE_MS: 1500,
  useRecordUpdated: () => undefined,
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const allTicketsConfig = {
  title: 'All Support Tickets',
  apiEndpoint: '/analytics/support-ticket',
  requireFiltersBeforeShowing: true,
  requireFiltersRoles: ['CSE'],
};

describe('TicketTableComponent empty state', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ data: [], page_meta: null }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks a selected role to apply a filter instead of showing "No data found"', async () => {
    tenant.customRole = 'CSE';
    render(<TicketTableComponent config={allTicketsConfig} />);

    expect((await screen.findAllByText('Apply at least one filter to see tickets.')).length).toBeGreaterThan(0);
    expect(screen.queryByText('No data found')).toBeNull();
  });

  it('shows "No data found" for roles the setting does not apply to', async () => {
    tenant.customRole = 'GM';
    render(<TicketTableComponent config={allTicketsConfig} />);

    expect((await screen.findAllByText('No data found')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Apply at least one filter to see tickets.')).toBeNull();
  });
});
