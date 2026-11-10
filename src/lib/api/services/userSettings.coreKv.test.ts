import { beforeEach, describe, expect, it, vi } from 'vitest';

import { leadTypeAssignmentApi } from './userSettings';

const get = vi.fn();

vi.mock('../client', () => ({
  apiClient: { get: (...args: unknown[]) => get(...args) },
}));

describe('leadTypeAssignmentApi.getAllUsersCoreKVSettings', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('calls the bulk endpoint once and returns settings keyed by membership id', async () => {
    const results = {
      '67': [{ id: 41, tenant: 't', tenant_membership: 67, key: 'DAILY_TARGET', value: 10 }],
      '68': [{ id: 42, tenant: 't', tenant_membership: 68, key: 'GROUP', value: 5 }],
    };
    get.mockResolvedValue({ data: { results } });

    await expect(leadTypeAssignmentApi.getAllUsersCoreKVSettings()).resolves.toEqual(results);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/user-settings/core-kv-settings/');
  });

  it('returns an empty map when the response has no results', async () => {
    get.mockResolvedValue({ data: {} });

    await expect(leadTypeAssignmentApi.getAllUsersCoreKVSettings()).resolves.toEqual({});
  });

  it('returns null when the backend does not have the endpoint yet', async () => {
    get.mockRejectedValue({ response: { status: 404 } });

    await expect(leadTypeAssignmentApi.getAllUsersCoreKVSettings()).resolves.toBeNull();
  });

  it('rethrows other errors', async () => {
    const error = { response: { status: 500 } };
    get.mockRejectedValue(error);

    await expect(leadTypeAssignmentApi.getAllUsersCoreKVSettings()).rejects.toBe(error);
  });
});
