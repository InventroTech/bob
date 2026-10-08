import { describe, expect, it, vi } from 'vitest';
import {
  buildBulkEditPayload,
  bulkEditActorLabel,
  bulkEditEventName,
  fetchBulkEditHistory,
  logBulkEdit,
  parseBulkEditHistory,
  summarizeBulkEditTargets,
} from './bulkEditHistory';

const changes = [
  { record_id: '11', item: 'Drone', from: 'NEW_REQUEST', to: 'ORDERED' },
  { record_id: '12', item: 'Battery', from: 'APPROVED', to: 'ORDERED' },
  { record_id: '13', item: 'Box', from: 'APPROVED', to: 'IN_CART' },
];

describe('bulkEditEventName', () => {
  it('scopes the event per module', () => {
    expect(bulkEditEventName('unmannd_request')).toBe('unmannd_request.bulk_status_update');
    expect(bulkEditEventName('inventory_request')).toBe('inventory_request.bulk_status_update');
  });

  it('falls back to a generic name', () => {
    expect(bulkEditEventName(null)).toBe('request.bulk_status_update');
    expect(bulkEditEventName(undefined)).toBe('request.bulk_status_update');
  });
});

describe('buildBulkEditPayload', () => {
  it('counts changes and fills defaults', () => {
    const payload = buildBulkEditPayload({ entityType: 'unmannd_request', changes });
    expect(payload.count).toBe(3);
    expect(payload.field).toBe('status');
    expect(payload.entity_type).toBe('unmannd_request');
    expect(payload.actor).toEqual({ id: null, email: null, name: null });
    expect(payload.batch_id).toBeTruthy();
  });

  it('drops changes without a record id', () => {
    const payload = buildBulkEditPayload({
      changes: [...changes, { record_id: '', item: 'x', from: 'A', to: 'B' }],
    });
    expect(payload.count).toBe(3);
    expect(payload.entity_type).toBeNull();
  });

  it('gives each batch its own id', () => {
    expect(buildBulkEditPayload({ changes }).batch_id).not.toBe(buildBulkEditPayload({ changes }).batch_id);
  });

  it('keeps the actor', () => {
    const payload = buildBulkEditPayload({ changes, actor: { id: 'u1', email: 'a@b.com', name: 'Ritam' } });
    expect(payload.actor).toEqual({ id: 'u1', email: 'a@b.com', name: 'Ritam' });
  });
});

describe('logBulkEdit', () => {
  it('posts one event on the first changed record', async () => {
    const post = vi.fn().mockResolvedValue({ data: { ok: true } });
    const payload = buildBulkEditPayload({ entityType: 'unmannd_request', changes });
    await expect(logBulkEdit({ post } as any, payload)).resolves.toBe(true);
    expect(post).toHaveBeenCalledWith('/crm-records/records/events/', {
      record_id: 11,
      event: 'unmannd_request.bulk_status_update',
      payload,
    });
  });

  it('skips empty batches', async () => {
    const post = vi.fn();
    await expect(logBulkEdit({ post } as any, buildBulkEditPayload({ changes: [] }))).resolves.toBe(false);
    expect(post).not.toHaveBeenCalled();
  });

  it('never throws when the API fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const post = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(logBulkEdit({ post } as any, buildBulkEditPayload({ changes }))).resolves.toBe(false);
    warn.mockRestore();
  });
});

describe('parseBulkEditHistory', () => {
  const raw = {
    id: 7,
    timestamp: '2026-10-03T12:00:00Z',
    payload: { batch_id: 'b1', entity_type: 'unmannd_request', field: 'status', count: 3, actor: { name: 'Ritam' }, changes },
  };

  it.each([
    ['data envelope', { data: [raw] }],
    ['results envelope', { results: [raw] }],
    ['bare list', [raw]],
  ])('reads a %s', (_label, body) => {
    const [entry] = parseBulkEditHistory(body);
    expect(entry.id).toBe('7');
    expect(entry.timestamp).toBe('2026-10-03T12:00:00Z');
    expect(entry.count).toBe(3);
    expect(entry.actor.name).toBe('Ritam');
    expect(entry.changes).toHaveLength(3);
  });

  it('skips events without a changes list', () => {
    expect(parseBulkEditHistory({ data: [{ id: 1, payload: {} }, { id: 2 }, null] })).toEqual([]);
  });

  it('handles empty / odd bodies', () => {
    expect(parseBulkEditHistory(null)).toEqual([]);
    expect(parseBulkEditHistory({})).toEqual([]);
    expect(parseBulkEditHistory('nope')).toEqual([]);
  });

  it('defaults count to the number of changes', () => {
    const [entry] = parseBulkEditHistory([{ id: 1, payload: { changes } }]);
    expect(entry.count).toBe(3);
    expect(entry.field).toBe('status');
  });
});

describe('fetchBulkEditHistory', () => {
  it('asks for this module’s events', async () => {
    const get = vi.fn().mockResolvedValue({ data: { data: [] } });
    await fetchBulkEditHistory({ get } as any, 'inventory_request');
    expect(get).toHaveBeenCalledWith('/crm-records/events/', {
      params: { event: 'inventory_request.bulk_status_update', page_size: 50 },
    });
  });
});

describe('summarizeBulkEditTargets', () => {
  it('counts per new value, biggest first', () => {
    expect(summarizeBulkEditTargets(changes)).toEqual([
      { to: 'ORDERED', count: 2 },
      { to: 'IN_CART', count: 1 },
    ]);
  });

  it('is empty for no changes', () => {
    expect(summarizeBulkEditTargets([])).toEqual([]);
  });
});

describe('bulkEditActorLabel', () => {
  it('prefers name, then email', () => {
    expect(bulkEditActorLabel({ name: 'Ritam', email: 'r@x.com' })).toBe('Ritam');
    expect(bulkEditActorLabel({ name: ' ', email: 'r@x.com' })).toBe('r@x.com');
    expect(bulkEditActorLabel({})).toBe('Unknown user');
    expect(bulkEditActorLabel(null)).toBe('Unknown user');
  });
});
