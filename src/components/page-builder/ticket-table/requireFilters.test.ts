import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { requiresFiltersBeforeShowing } from './utils';
import { useTicketTable } from './useTicketTable';

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

describe('requiresFiltersBeforeShowing', () => {
  it('is off when the table setting is not enabled', () => {
    expect(requiresFiltersBeforeShowing(undefined, 'CSE')).toBe(false);
    expect(requiresFiltersBeforeShowing({ requireFiltersRoles: ['CSE'] }, 'CSE')).toBe(false);
    expect(requiresFiltersBeforeShowing({ requireFiltersBeforeShowing: false, requireFiltersRoles: ['CSE'] }, 'CSE')).toBe(false);
  });

  it('applies to everyone when enabled with no roles selected', () => {
    expect(requiresFiltersBeforeShowing({ requireFiltersBeforeShowing: true }, 'GM')).toBe(true);
    expect(requiresFiltersBeforeShowing({ requireFiltersBeforeShowing: true, requireFiltersRoles: [] }, null)).toBe(true);
  });

  it('applies only to the selected roles, ignoring case', () => {
    const config = { requireFiltersBeforeShowing: true, requireFiltersRoles: ['CSE'] };
    expect(requiresFiltersBeforeShowing(config, 'CSE')).toBe(true);
    expect(requiresFiltersBeforeShowing(config, 'cse')).toBe(true);
    expect(requiresFiltersBeforeShowing(config, 'GM')).toBe(false);
    expect(requiresFiltersBeforeShowing(config, null)).toBe(false);
  });
});

describe('useTicketTable with the Ticket Visibility setting', () => {
  const fetchMock = vi.fn();
  const listCalls = () =>
    fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('page_size=50'));

  beforeEach(() => {
    tenant.customRole = null;
    tenant.membershipLoaded = true;
    vi.mocked(toast.info).mockClear();
    fetchMock.mockReset();
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: [], page_meta: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const allTicketsConfig = {
    apiEndpoint: '/analytics/support-ticket',
    requireFiltersBeforeShowing: true,
    requireFiltersRoles: ['CSE'],
  };

  it('does not load the ticket list for a selected role until a filter is applied', async () => {
    tenant.customRole = 'CSE';
    const { result } = renderHook(() => useTicketTable({ config: allTicketsConfig }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listCalls()).toHaveLength(0);
    expect(result.current.requireFiltersToShow).toBe(true);
    expect(result.current.filteredData).toEqual([]);
  });

  it('loads the ticket list for roles that are not selected', async () => {
    tenant.customRole = 'GM';
    renderHook(() => useTicketTable({ config: allTicketsConfig }));

    await waitFor(() => expect(listCalls()).toHaveLength(1));
  });

  it('loads the ticket list on tables without the setting, even for a CSE', async () => {
    tenant.customRole = 'CSE';
    const { result } = renderHook(() =>
      useTicketTable({ config: { apiEndpoint: '/support-ticket/get-wip-tickets' } }),
    );

    await waitFor(() => expect(listCalls()).toHaveLength(1));
    expect(result.current.requireFiltersToShow).toBe(false);
  });

  it('keeps the list empty and tells the user when Apply Filters is clicked with nothing selected', async () => {
    tenant.customRole = 'CSE';
    const { result } = renderHook(() => useTicketTable({ config: allTicketsConfig }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.applyFilters();
    });

    expect(listCalls()).toHaveLength(0);
    expect(toast.info).toHaveBeenCalledWith('Select at least one filter to see tickets');
    expect(result.current.filtersApplied).toBe(false);
    expect(result.current.filteredData).toEqual([]);
  });

  it('loads the matching tickets once a filter is applied', async () => {
    tenant.customRole = 'CSE';
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            String(url).includes('resolution_status=')
              ? {
                  data: [{ id: 7, first_name: 'Ravi', last_name: 'Kumar', resolution_status: null }],
                  page_meta: { total_count: 1, number_of_pages: 1, current_page: 1, page_size: 50 },
                }
              : { data: [], page_meta: null },
          ),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    const { result } = renderHook(() => useTicketTable({ config: allTicketsConfig }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setResolutionStatusFilter(['Open']));
    await act(async () => {
      await result.current.applyFilters();
    });

    expect(listCalls()).toHaveLength(1);
    expect(listCalls()[0]).toContain('/analytics/support-ticket/?resolution_status=null');
    expect(result.current.filtersApplied).toBe(true);
    expect(result.current.filteredData.map((row) => row.id)).toEqual([7]);
  });

  it('empties the list again on Reset Filters', async () => {
    tenant.customRole = 'CSE';
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: [{ id: 7, first_name: 'Ravi', last_name: 'Kumar' }],
            page_meta: { total_count: 1, number_of_pages: 1, current_page: 1, page_size: 50 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    const { result } = renderHook(() => useTicketTable({ config: allTicketsConfig }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setResolutionStatusFilter(['Open']));
    await act(async () => {
      await result.current.applyFilters();
    });
    expect(result.current.filteredData).toHaveLength(1);

    act(() => result.current.resetFilters());

    expect(result.current.filtersApplied).toBe(false);
    expect(result.current.filteredData).toEqual([]);
    expect(result.current.pagination.totalCount).toBe(0);
  });

  it('does not load tickets from a search alone', async () => {
    tenant.customRole = 'CSE';
    const { result } = renderHook(() => useTicketTable({ config: allTicketsConfig }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.handleSearchChange('Ravi'));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    expect(fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('search='))).toHaveLength(0);
    expect(listCalls()).toHaveLength(0);
    expect(result.current.filteredData).toEqual([]);
  });

  it('waits for the role before loading when the setting is on', async () => {
    tenant.customRole = null;
    tenant.membershipLoaded = false;
    const { rerender } = renderHook(() => useTicketTable({ config: allTicketsConfig }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(listCalls()).toHaveLength(0);

    tenant.customRole = 'GM';
    tenant.membershipLoaded = true;
    rerender();
    await waitFor(() => expect(listCalls()).toHaveLength(1));
  });
});
