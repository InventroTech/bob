import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRequestStatusConfig } from './useRequestStatusConfig';
import {
  DEFAULT_REQUEST_STATUS_CONFIG,
  resetRequestStatusConfigCache,
} from '@/lib/inventory/requestStatus';

const apiGet = vi.fn();
vi.mock('@/lib/api', () => ({ apiClient: { get: (...args: unknown[]) => apiGet(...args) } }));

const customConfig = {
  entity_type: 'unmannd_request',
  is_custom: true,
  pages: [{ id: 'pending_approval', label: 'Pending', order: 1 }],
  statuses: [
    { value: 'APPROVED', label: 'Vendor OK', color: 'green', page: 'pending_approval', order: 1, active: true },
  ],
};

describe('useRequestStatusConfig', () => {
  afterEach(() => {
    act(() => resetRequestStatusConfigCache());
    apiGet.mockReset();
    vi.restoreAllMocks();
  });

  it('returns defaults first, then the loaded config', async () => {
    apiGet.mockResolvedValueOnce({ data: customConfig });
    const { result } = renderHook(() => useRequestStatusConfig('unmannd_request'));
    expect(result.current).toBe(DEFAULT_REQUEST_STATUS_CONFIG);
    await waitFor(() => expect(result.current.statuses[0].label).toBe('Vendor OK'));
    expect(apiGet).toHaveBeenCalledWith('/crm-records/status-config/', {
      params: { entity_type: 'unmannd_request' },
    });
  });

  it('does not fetch for non-request or missing entity types', () => {
    renderHook(() => useRequestStatusConfig('lead'));
    renderHook(() => useRequestStatusConfig(null));
    renderHook(() => useRequestStatusConfig(undefined));
    expect(apiGet).not.toHaveBeenCalled();
  });

  it('shares one fetch between components', async () => {
    apiGet.mockResolvedValueOnce({ data: customConfig });
    const a = renderHook(() => useRequestStatusConfig('unmannd_request'));
    const b = renderHook(() => useRequestStatusConfig('unmannd_request'));
    await waitFor(() => expect(a.result.current.statuses[0].label).toBe('Vendor OK'));
    expect(b.result.current.statuses[0].label).toBe('Vendor OK');
    expect(apiGet).toHaveBeenCalledTimes(1);
  });

  it('refetches when the entity type changes', async () => {
    apiGet.mockResolvedValueOnce({ data: customConfig });
    apiGet.mockResolvedValueOnce({
      data: { ...customConfig, entity_type: 'inventory_request', statuses: [{ ...customConfig.statuses[0], label: 'Inventory OK' }] },
    });
    const { result, rerender } = renderHook(({ type }) => useRequestStatusConfig(type), {
      initialProps: { type: 'unmannd_request' },
    });
    await waitFor(() => expect(result.current.statuses[0].label).toBe('Vendor OK'));
    rerender({ type: 'inventory_request' });
    await waitFor(() => expect(result.current.statuses[0].label).toBe('Inventory OK'));
    expect(apiGet).toHaveBeenCalledTimes(2);
  });

  it('keeps defaults when the fetch fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    apiGet.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useRequestStatusConfig('inventory_request'));
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    expect(result.current).toBe(DEFAULT_REQUEST_STATUS_CONFIG);
  });

  it('re-renders after a cache reset', async () => {
    apiGet.mockResolvedValueOnce({ data: customConfig });
    const { result } = renderHook(() => useRequestStatusConfig('unmannd_request'));
    await waitFor(() => expect(result.current.statuses[0].label).toBe('Vendor OK'));
    act(() => resetRequestStatusConfigCache());
    expect(result.current).toBe(DEFAULT_REQUEST_STATUS_CONFIG);
  });
});
