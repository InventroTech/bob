import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CORE_KV_SETTINGS_BATCH_SIZE, leadTypeAssignmentApi } from './userSettings';

const get = vi.fn();

vi.mock('../client', () => ({
  apiClient: { get: (...args: unknown[]) => get(...args) },
}));

const idsFrom = (count: number, start = 1) => Array.from({ length: count }, (_, index) => start + index);
const requestedIds = (call: unknown[]) =>
  String((call[1] as { params: { membership_ids: string } }).params.membership_ids)
    .split(',')
    .map(Number);

describe('leadTypeAssignmentApi.getCoreKVSettingsForMembers', () => {
  beforeEach(() => {
    get.mockReset();
    get.mockResolvedValue({ data: { results: {} } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses batches of 60', () => {
    expect(CORE_KV_SETTINGS_BATCH_SIZE).toBe(60);
  });

  it('sends no request when there are no members', async () => {
    await expect(leadTypeAssignmentApi.getCoreKVSettingsForMembers([])).resolves.toEqual({});
    expect(get).not.toHaveBeenCalled();
  });

  it('splits members into batches of at most 60 ids, one request each', async () => {
    const ids = idsFrom(130);

    await leadTypeAssignmentApi.getCoreKVSettingsForMembers(ids);

    expect(get).toHaveBeenCalledTimes(3);
    expect(get.mock.calls.map((call) => call[0])).toEqual([
      '/user-settings/core-kv-settings/',
      '/user-settings/core-kv-settings/',
      '/user-settings/core-kv-settings/',
    ]);
    const batches = get.mock.calls.map(requestedIds);
    expect(batches.map((batch) => batch.length)).toEqual([60, 60, 10]);
    expect(batches.flat()).toEqual(ids);
  });

  it('sends the batches one after another, not all at once', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    get.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 0));
      inFlight -= 1;
      return { data: { results: {} } };
    });

    await leadTypeAssignmentApi.getCoreKVSettingsForMembers(idsFrom(180));

    expect(get).toHaveBeenCalledTimes(3);
    expect(maxInFlight).toBe(1);
  });

  it('does not request the same member twice', async () => {
    await leadTypeAssignmentApi.getCoreKVSettingsForMembers([67, 68, 67]);

    expect(get).toHaveBeenCalledTimes(1);
    expect(requestedIds(get.mock.calls[0])).toEqual([67, 68]);
  });

  it('turns each batch’s key/value map into rows and merges all batches', async () => {
    get
      .mockResolvedValueOnce({ data: { results: { '1': { DAILY_TARGET: 10, GROUP: 5 } } } })
      .mockResolvedValueOnce({ data: { results: { '61': { DAILY_LIMIT: 30 } } } });

    const result = await leadTypeAssignmentApi.getCoreKVSettingsForMembers(idsFrom(61));

    expect(result).toEqual({
      '1': [
        { key: 'DAILY_TARGET', value: 10 },
        { key: 'GROUP', value: 5 },
      ],
      '61': [{ key: 'DAILY_LIMIT', value: 30 }],
    });
  });

  it('warns when more than 10 batches are needed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await leadTypeAssignmentApi.getCoreKVSettingsForMembers(idsFrom(601));

    expect(get).toHaveBeenCalledTimes(11);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('11 batches'));
  });

  it('does not warn for 10 batches or fewer', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await leadTypeAssignmentApi.getCoreKVSettingsForMembers(idsFrom(600));

    expect(get).toHaveBeenCalledTimes(10);
    expect(warn).not.toHaveBeenCalled();
  });

  it('returns null when the backend does not have the batch endpoint yet', async () => {
    get.mockRejectedValue({ response: { status: 404 } });

    await expect(leadTypeAssignmentApi.getCoreKVSettingsForMembers([67])).resolves.toBeNull();
  });

  it('rethrows other errors', async () => {
    const error = { response: { status: 500 } };
    get.mockRejectedValue(error);

    await expect(leadTypeAssignmentApi.getCoreKVSettingsForMembers([67])).rejects.toBe(error);
  });
});
