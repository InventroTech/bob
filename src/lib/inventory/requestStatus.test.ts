import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_REQUEST_STATUS_CONFIG,
  DEFAULT_REQUEST_STATUS_OPTIONS,
  DEFAULT_REQUEST_STATUS_PAGES,
  DEFAULT_STATUS_TONE_CLASS,
  LEGACY_REQUEST_STATUS_ALIASES,
  POST_ORDER_REQUEST_STATUSES,
  REQUEST_STATUS,
  REQUEST_STATUS_ENTITY_TYPES,
  findRequestStatusOption,
  getAllowedNextRequestStatuses,
  isRequestStatusTransitionAllowed,
  getRequestStatusConfig,
  getRequestStatusConfigVersion,
  getRequestStatusDropdownOptions,
  getRequestStatusLabel,
  getRequestStatusPage,
  getRequestStatusValues,
  getRequestStatusesForPage,
  getRequestStatusToneClass,
  isRequestOnlyStatusCode,
  loadRequestStatusConfig,
  normalizeRequestStatus,
  normalizeStatusCode,
  resetRequestStatusConfigCache,
  statusToneClassForColor,
  subscribeRequestStatusConfig,
} from './requestStatus';

const apiGet = vi.fn();
vi.mock('@/lib/api', () => ({ apiClient: { get: (...args: unknown[]) => apiGet(...args) } }));

const ALL_STATUSES = [
  'NEW_REQUEST',
  'REQ_TO_VERIFY',
  'APPROVED',
  'IN_CART',
  'ON_HOLD',
  'REJECTED',
  'ORDERED',
  'DELIVERED',
  'EXCEPTION',
];

function mockConfig(data: unknown) {
  apiGet.mockResolvedValueOnce({ data });
}

describe('requestStatus', () => {
  afterEach(() => {
    resetRequestStatusConfigCache();
    apiGet.mockReset();
    vi.restoreAllMocks();
  });

  it('maps legacy codes to the combined statuses', () => {
    expect(normalizeRequestStatus('VENDOR_IDENTIFIED')).toBe('APPROVED');
    expect(normalizeRequestStatus('in shipping')).toBe('ORDERED');
    expect(normalizeRequestStatus('req to verify')).toBe('REQ_TO_VERIFY');
  });

  it('uses built-in labels, colours and pages before the config loads', () => {
    expect(getRequestStatusLabel('APPROVED')).toBe('Approved');
    expect(getRequestStatusLabel('VENDOR_IDENTIFIED')).toBe('Approved');
    expect(getRequestStatusLabel('CUSTOM_THING')).toBe('CUSTOM THING');
    expect(getRequestStatusToneClass('EXCEPTION')).toContain('text-red-800');
    expect(getRequestStatusPage('EXCEPTION')).toBe('ordered');
    expect(getRequestStatusesForPage('ordered')).toEqual(['ORDERED', 'IN_SHIPPING', 'EXCEPTION']);
    expect(getRequestStatusDropdownOptions().map((o) => o.value)).toEqual(ALL_STATUSES);
  });

  it('keeps an unknown current value visible in the dropdown', () => {
    const options = getRequestStatusDropdownOptions(null, 'PAID');
    expect(options[0]).toEqual({ value: 'PAID', label: 'PAID' });
  });

  it('loads and caches the tenant config per entity type', async () => {
    apiGet.mockResolvedValue({
      data: {
        entity_type: 'unmannd_request',
        is_custom: true,
        pages: [{ id: 'pending_approval', label: 'Pending', order: 1 }],
        statuses: [
          { value: 'APPROVED', label: 'Vendor OK', color: 'green', page: 'pending_approval', order: 1, active: true },
          { value: 'ON_HOLD', label: 'On hold', color: 'orange', page: null, order: 2, active: false },
        ],
      },
    });

    await loadRequestStatusConfig('unmannd_request');
    await loadRequestStatusConfig('unmannd_request');
    expect(apiGet).toHaveBeenCalledTimes(1);
    expect(apiGet).toHaveBeenCalledWith('/crm-records/status-config/', {
      params: { entity_type: 'unmannd_request' },
    });

    expect(getRequestStatusLabel('VENDOR_IDENTIFIED', 'unmannd_request')).toBe('Vendor OK');
    expect(getRequestStatusDropdownOptions('unmannd_request').map((o) => o.value)).toEqual([
      'APPROVED',
    ]);
    expect(getRequestStatusConfig('inventory_request').statuses).toHaveLength(9);
  });

  it('falls back to defaults when the request fails', async () => {
    apiGet.mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const config = await loadRequestStatusConfig('inventory_request');
    expect(config.statuses).toHaveLength(9);
  });
});

describe('constants', () => {
  it('has the nine combined statuses', () => {
    expect(Object.values(REQUEST_STATUS)).toEqual(ALL_STATUSES);
    expect(DEFAULT_REQUEST_STATUS_OPTIONS.map((s) => s.value)).toEqual(ALL_STATUSES);
  });

  it('maps only the two legacy codes', () => {
    expect(LEGACY_REQUEST_STATUS_ALIASES).toEqual({
      VENDOR_IDENTIFIED: 'APPROVED',
      IN_SHIPPING: 'ORDERED',
    });
  });

  it('lists post-order statuses', () => {
    expect(POST_ORDER_REQUEST_STATUSES).toEqual(['ORDERED', 'DELIVERED', 'EXCEPTION']);
  });

  it('marks defaults active, builtin and ordered', () => {
    DEFAULT_REQUEST_STATUS_OPTIONS.forEach((s, index) => {
      expect(s.active).toBe(true);
      expect(s.builtin).toBe(true);
      expect(s.order).toBe(index + 1);
    });
  });

  it('points every default status at a default page', () => {
    const pageIds = new Set(DEFAULT_REQUEST_STATUS_PAGES.map((p) => p.id));
    for (const s of DEFAULT_REQUEST_STATUS_OPTIONS) expect(pageIds.has(s.page!)).toBe(true);
  });

  it('matches the backend page mapping', () => {
    const pages = Object.fromEntries(DEFAULT_REQUEST_STATUS_OPTIONS.map((s) => [s.value, s.page]));
    expect(pages).toEqual({
      NEW_REQUEST: 'pending_approval',
      REQ_TO_VERIFY: 'pending_approval',
      APPROVED: 'pending_approval',
      ON_HOLD: 'pending_approval',
      IN_CART: 'in_cart',
      ORDERED: 'ordered',
      EXCEPTION: 'ordered',
      DELIVERED: 'delivered',
      REJECTED: 'closed',
    });
  });

  it('only treats procurement and inventory as request entity types', () => {
    expect([...REQUEST_STATUS_ENTITY_TYPES].sort()).toEqual(['inventory_request', 'unmannd_request']);
  });
});

describe('normalizeStatusCode / normalizeRequestStatus', () => {
  it('handles empty values', () => {
    expect(normalizeStatusCode(null)).toBe('');
    expect(normalizeStatusCode(undefined)).toBe('');
    expect(normalizeStatusCode('   ')).toBe('');
    expect(normalizeRequestStatus(null)).toBe('');
  });

  it('upper-snakes spaces and dashes', () => {
    expect(normalizeStatusCode(' in  cart ')).toBe('IN_CART');
    expect(normalizeStatusCode('req-to-verify')).toBe('REQ_TO_VERIFY');
  });

  it('does not map legacy codes in normalizeStatusCode', () => {
    expect(normalizeStatusCode('vendor identified')).toBe('VENDOR_IDENTIFIED');
  });

  it('leaves every current status unchanged', () => {
    for (const s of ALL_STATUSES) {
      expect(normalizeRequestStatus(s)).toBe(s);
      expect(normalizeRequestStatus(s.toLowerCase())).toBe(s);
    }
  });

  it('passes custom codes through', () => {
    expect(normalizeRequestStatus('paid')).toBe('PAID');
    expect(normalizeRequestStatus(42)).toBe('42');
  });
});

describe('statusToneClassForColor', () => {
  it('maps known colours case-insensitively', () => {
    expect(statusToneClassForColor('green')).toContain('emerald');
    expect(statusToneClassForColor(' RED ')).toContain('rose');
    expect(statusToneClassForColor('indigo')).toContain('indigo');
  });

  it('maps the status text hex codes in any case', () => {
    expect(statusToneClassForColor('#2563EB')).toContain('border-blue-300 bg-blue-50 text-blue-700');
    expect(statusToneClassForColor('#6D28D9')).toContain('border-violet-300 bg-violet-50 text-violet-700');
    expect(statusToneClassForColor('#78350F')).toContain('border-amber-300 bg-amber-50 text-amber-900');
    expect(statusToneClassForColor('#1A3673')).toContain('border-[#1A3673]/35 bg-[#EEF2FA] text-[#1A3673]');
    expect(statusToneClassForColor(' #1B6FE8 ')).toContain('border-[#1B6FE8]/40 bg-[#E8F1FD] text-[#0A4CB8]');
    expect(statusToneClassForColor('#15803D')).toContain('border-green-500 bg-green-50 text-green-800');
    expect(statusToneClassForColor('#B91C1C')).toContain('border-red-400 bg-red-50 text-red-800');
    expect(statusToneClassForColor('#123456')).toBe(DEFAULT_STATUS_TONE_CLASS);
  });

  it('uses the agreed default background and text per status', () => {
    expect(
      Object.fromEntries(DEFAULT_REQUEST_STATUS_OPTIONS.map((s) => [s.value, [s.background, s.color]]))
    ).toEqual({
      NEW_REQUEST: ['#FFFBEB', '#78350F'],
      REQ_TO_VERIFY: ['#F5F3FF', '#6D28D9'],
      APPROVED: ['#DCFCE7', '#16A34A'],
      IN_CART: ['#E8F1FD', '#1B6FE8'],
      ON_HOLD: ['#FFF7ED', '#F97316'],
      REJECTED: ['#FEE2E2', '#DC2626'],
      ORDERED: ['#EEF2FA', '#1A3673'],
      DELIVERED: ['#DCFCE7', '#15803D'],
      EXCEPTION: ['#FEE2E2', '#B91C1C'],
    });
  });

  it('falls back for unknown or empty colours', () => {
    expect(statusToneClassForColor('chartreuse')).toBe(DEFAULT_STATUS_TONE_CLASS);
    expect(statusToneClassForColor(null)).toBe(DEFAULT_STATUS_TONE_CLASS);
    expect(statusToneClassForColor(undefined)).toBe(DEFAULT_STATUS_TONE_CLASS);
  });

  it('gives every default status its own tone', () => {
    const tones = DEFAULT_REQUEST_STATUS_OPTIONS.map((s) => statusToneClassForColor(s.color));
    expect(new Set(tones).size).toBe(tones.length);
    expect(tones).not.toContain(DEFAULT_STATUS_TONE_CLASS);
  });
});

describe('lookups with defaults', () => {
  afterEach(() => resetRequestStatusConfigCache());

  it('finds options by any spelling', () => {
    expect(findRequestStatusOption('in cart')?.value).toBe('IN_CART');
    expect(findRequestStatusOption('IN_SHIPPING')?.value).toBe('ORDERED');
    expect(findRequestStatusOption('')).toBeUndefined();
    expect(findRequestStatusOption(null)).toBeUndefined();
    expect(findRequestStatusOption('PAID')).toBeUndefined();
  });

  it('labels every default status', () => {
    expect(ALL_STATUSES.map((s) => getRequestStatusLabel(s))).toEqual([
      'New request',
      'Req to verify',
      'Approved',
      'In cart',
      'On hold',
      'Rejected',
      'Ordered',
      'Delivered',
      'Exception',
    ]);
  });

  it('shows a dash for empty labels', () => {
    expect(getRequestStatusLabel('')).toBe('—');
    expect(getRequestStatusLabel(null)).toBe('—');
    expect(getRequestStatusLabel('   ')).toBe('—');
  });

  it('formats unknown codes readably', () => {
    expect(getRequestStatusLabel('waiting payment')).toBe('WAITING PAYMENT');
  });

  it('uses the default tone for unknown statuses', () => {
    expect(getRequestStatusToneClass('PAID')).toBe(DEFAULT_STATUS_TONE_CLASS);
    expect(getRequestStatusToneClass('')).toBe(DEFAULT_STATUS_TONE_CLASS);
  });

  it('returns null page for unknown statuses', () => {
    expect(getRequestStatusPage('PAID')).toBeNull();
    expect(getRequestStatusPage('')).toBeNull();
  });

  it('lists stored codes per page including legacy', () => {
    expect(getRequestStatusesForPage('pending_approval')).toEqual([
      'NEW_REQUEST',
      'REQ_TO_VERIFY',
      'APPROVED',
      'VENDOR_IDENTIFIED',
      'ON_HOLD',
    ]);
    expect(getRequestStatusesForPage('in_cart')).toEqual(['IN_CART']);
    expect(getRequestStatusesForPage('delivered')).toEqual(['DELIVERED']);
    expect(getRequestStatusesForPage('closed')).toEqual(['REJECTED']);
    expect(getRequestStatusesForPage('nope')).toEqual([]);
  });

  it('lists active values', () => {
    expect(getRequestStatusValues()).toEqual(ALL_STATUSES);
  });

  it('dropdown does not duplicate a known current value', () => {
    const options = getRequestStatusDropdownOptions(null, 'vendor identified');
    expect(options.map((o) => o.value)).toEqual(ALL_STATUSES);
  });

  it('dropdown ignores an empty current value', () => {
    expect(getRequestStatusDropdownOptions(null, '')).toHaveLength(9);
  });

  it('returns defaults for non-request or unloaded entity types', () => {
    expect(getRequestStatusConfig('lead')).toBe(DEFAULT_REQUEST_STATUS_CONFIG);
    expect(getRequestStatusConfig('unmannd_request')).toBe(DEFAULT_REQUEST_STATUS_CONFIG);
    expect(getRequestStatusConfig(null)).toBe(DEFAULT_REQUEST_STATUS_CONFIG);
  });
});

describe('config store', () => {
  afterEach(() => {
    resetRequestStatusConfigCache();
    apiGet.mockReset();
    vi.restoreAllMocks();
  });

  const customConfig = {
    entity_type: 'unmannd_request',
    is_custom: true,
    pages: [
      { id: 'paid', label: 'Paid', order: 2 },
      { id: 'pending_approval', label: 'Pending', order: 1 },
    ],
    statuses: [
      { value: 'PAID', label: 'Paid', color: 'green', page: 'paid', order: 3, active: true },
      { value: 'NEW_REQUEST', label: 'Fresh', color: 'blue', page: 'pending_approval', order: 1, active: true },
      { value: 'VENDOR_IDENTIFIED', label: 'Vendor OK', color: 'teal', page: 'pending_approval', order: 2, active: true },
      { value: 'ON_HOLD', label: 'Hold', color: 'orange', page: 'pending_approval', order: 4, active: false },
    ],
  };

  it('does not fetch for non-request entity types', async () => {
    const config = await loadRequestStatusConfig('lead');
    expect(config).toBe(DEFAULT_REQUEST_STATUS_CONFIG);
    expect(apiGet).not.toHaveBeenCalled();
  });

  it('shares one in-flight request between concurrent callers', async () => {
    mockConfig(customConfig);
    const [a, b] = await Promise.all([
      loadRequestStatusConfig('unmannd_request'),
      loadRequestStatusConfig('unmannd_request'),
    ]);
    expect(apiGet).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it('fetches each entity type separately', async () => {
    mockConfig(customConfig);
    mockConfig({ ...customConfig, entity_type: 'inventory_request' });
    await loadRequestStatusConfig('unmannd_request');
    await loadRequestStatusConfig('inventory_request');
    expect(apiGet).toHaveBeenCalledTimes(2);
    expect(apiGet.mock.calls[1][1]).toEqual({ params: { entity_type: 'inventory_request' } });
  });

  it('sorts statuses and pages by order and maps legacy values', async () => {
    mockConfig(customConfig);
    const config = await loadRequestStatusConfig('unmannd_request');
    expect(config.pages.map((p) => p.id)).toEqual(['pending_approval', 'paid']);
    expect(config.statuses.map((s) => s.value)).toEqual(['NEW_REQUEST', 'APPROVED', 'PAID', 'ON_HOLD']);
    expect(config.is_custom).toBe(true);
  });

  it('uses the loaded config for lookups', async () => {
    mockConfig(customConfig);
    await loadRequestStatusConfig('unmannd_request');
    expect(getRequestStatusLabel('NEW_REQUEST', 'unmannd_request')).toBe('Fresh');
    expect(getRequestStatusToneClass('APPROVED', 'unmannd_request')).toContain('teal');
    expect(getRequestStatusPage('PAID', 'unmannd_request')).toBe('paid');
    expect(getRequestStatusesForPage('paid', 'unmannd_request')).toEqual(['PAID']);
    expect(getRequestStatusValues('unmannd_request')).toEqual(['NEW_REQUEST', 'APPROVED', 'PAID']);
    expect(getRequestStatusLabel('IN_CART', 'unmannd_request')).toBe('IN CART');
  });

  it('keeps a hidden current status in the dropdown with its label', async () => {
    mockConfig(customConfig);
    await loadRequestStatusConfig('unmannd_request');
    const options = getRequestStatusDropdownOptions('unmannd_request', 'ON_HOLD');
    expect(options[0]).toEqual({ value: 'ON_HOLD', label: 'Hold' });
    expect(options).toHaveLength(4);
  });

  it('uses the first loaded config when no entity type is given', async () => {
    mockConfig(customConfig);
    await loadRequestStatusConfig('unmannd_request');
    expect(getRequestStatusConfig(null).statuses[0].label).toBe('Fresh');
    expect(getRequestStatusConfig(undefined).statuses[0].label).toBe('Fresh');
  });

  it('fills missing fields with defaults', async () => {
    mockConfig({
      statuses: [{ value: 'PAID' }, { value: 'NEW_REQUEST', label: 'New', active: false }],
    });
    const config = await loadRequestStatusConfig('unmannd_request');
    expect(config.statuses[0]).toEqual({
      value: 'PAID',
      label: 'PAID',
      color: 'gray',
      background: null,
      page: null,
      order: 1,
      active: true,
      builtin: false,
    });
    expect(config.statuses[1].active).toBe(false);
    expect(config.pages).toEqual(DEFAULT_REQUEST_STATUS_PAGES);
    expect(config.is_custom).toBe(false);
  });

  it('drops invalid status and page entries', async () => {
    mockConfig({
      pages: [null, { label: 'no id' }, { id: '' }, { id: 'ok' }],
      statuses: [null, { label: 'no value' }, { value: '' }, { value: 'APPROVED' }],
    });
    const config = await loadRequestStatusConfig('unmannd_request');
    expect(config.statuses.map((s) => s.value)).toEqual(['APPROVED']);
    expect(config.pages).toEqual([{ id: 'ok', label: 'ok', order: 1 }]);
  });

  it('falls back to defaults (and refetches later) for an empty payload', async () => {
    mockConfig({ statuses: [] });
    const first = await loadRequestStatusConfig('unmannd_request');
    expect(first).toBe(DEFAULT_REQUEST_STATUS_CONFIG);
    mockConfig(customConfig);
    await loadRequestStatusConfig('unmannd_request');
    expect(apiGet).toHaveBeenCalledTimes(2);
  });

  it('falls back to defaults for non-object payloads', async () => {
    mockConfig(null);
    expect(await loadRequestStatusConfig('unmannd_request')).toBe(DEFAULT_REQUEST_STATUS_CONFIG);
    mockConfig('oops');
    expect(await loadRequestStatusConfig('unmannd_request')).toBe(DEFAULT_REQUEST_STATUS_CONFIG);
  });

  it('retries after a failed request', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    apiGet.mockRejectedValueOnce(new Error('offline'));
    await loadRequestStatusConfig('unmannd_request');
    mockConfig(customConfig);
    await loadRequestStatusConfig('unmannd_request');
    expect(getRequestStatusLabel('NEW_REQUEST', 'unmannd_request')).toBe('Fresh');
  });

  it('notifies subscribers when a config loads and on reset', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRequestStatusConfig(listener);
    const before = getRequestStatusConfigVersion();
    mockConfig(customConfig);
    await loadRequestStatusConfig('unmannd_request');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getRequestStatusConfigVersion()).toBe(before + 1);
    resetRequestStatusConfigCache();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    resetRequestStatusConfigCache();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('does not notify when the fetch fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const listener = vi.fn();
    const unsubscribe = subscribeRequestStatusConfig(listener);
    apiGet.mockRejectedValueOnce(new Error('offline'));
    await loadRequestStatusConfig('unmannd_request');
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('reset clears the cache', async () => {
    mockConfig(customConfig);
    await loadRequestStatusConfig('unmannd_request');
    resetRequestStatusConfigCache();
    expect(getRequestStatusConfig('unmannd_request')).toBe(DEFAULT_REQUEST_STATUS_CONFIG);
  });
});

describe('isRequestOnlyStatusCode', () => {
  it.each(['NEW_REQUEST', 'new request', 'Req to verify', 'IN_CART', 'VENDOR_IDENTIFIED', 'IN_SHIPPING'])(
    'treats %s as a request-only code',
    (value) => {
      expect(isRequestOnlyStatusCode(value)).toBe(true);
    }
  );

  it.each(['ON_HOLD', 'REJECTED', 'DELIVERED', 'APPROVED', 'open', '', null, undefined])(
    'does not claim shared / empty value %s',
    (value) => {
      expect(isRequestOnlyStatusCode(value)).toBe(false);
    }
  );
});

describe('status step order', () => {
  it.each([
    ['NEW_REQUEST', ['NEW_REQUEST', 'REQ_TO_VERIFY', 'ON_HOLD', 'REJECTED']],
    ['REQ_TO_VERIFY', ['REQ_TO_VERIFY', 'APPROVED', 'ON_HOLD', 'REJECTED']],
    ['APPROVED', ['APPROVED', 'IN_CART', 'ON_HOLD', 'REJECTED']],
    ['IN_CART', ['IN_CART', 'ON_HOLD', 'REJECTED', 'ORDERED']],
    ['ON_HOLD', ['ON_HOLD', 'NEW_REQUEST', 'REQ_TO_VERIFY', 'APPROVED', 'IN_CART', 'REJECTED']],
    ['ORDERED', ['ORDERED', 'DELIVERED', 'EXCEPTION']],
    ['EXCEPTION', ['EXCEPTION', 'ORDERED', 'DELIVERED']],
    ['DELIVERED', ['DELIVERED']],
    ['REJECTED', ['REJECTED']],
  ])('%s can move to %j', (from, expected) => {
    expect(getAllowedNextRequestStatuses(from)).toEqual(expected);
  });

  it('maps legacy codes before checking', () => {
    expect(getAllowedNextRequestStatuses('IN_SHIPPING')).toEqual(['ORDERED', 'DELIVERED', 'EXCEPTION']);
    expect(isRequestStatusTransitionAllowed('VENDOR_IDENTIFIED', 'IN_CART')).toBe(true);
  });

  it('blocks skipping and going backwards', () => {
    expect(isRequestStatusTransitionAllowed('NEW_REQUEST', 'APPROVED')).toBe(false);
    expect(isRequestStatusTransitionAllowed('NEW_REQUEST', 'DELIVERED')).toBe(false);
    expect(isRequestStatusTransitionAllowed('ORDERED', 'IN_CART')).toBe(false);
    expect(isRequestStatusTransitionAllowed('DELIVERED', 'ORDERED')).toBe(false);
    expect(isRequestStatusTransitionAllowed('ORDERED', 'ON_HOLD')).toBe(false);
    expect(isRequestStatusTransitionAllowed('IN_CART', 'EXCEPTION')).toBe(false);
  });

  it('blocks moving to the same status', () => {
    expect(isRequestStatusTransitionAllowed('DELIVERED', 'DELIVERED')).toBe(false);
    expect(isRequestStatusTransitionAllowed('ORDERED', 'ordered')).toBe(false);
    expect(isRequestStatusTransitionAllowed('in cart', 'IN_CART')).toBe(false);
    expect(isRequestStatusTransitionAllowed('CUSTOM_STEP', 'custom_step')).toBe(false);
  });

  it('allows an empty start and unknown statuses', () => {
    expect(isRequestStatusTransitionAllowed('', 'DELIVERED')).toBe(true);
    expect(isRequestStatusTransitionAllowed('CUSTOM_STEP', 'DELIVERED')).toBe(true);
    expect(isRequestStatusTransitionAllowed('NEW_REQUEST', 'CUSTOM_STEP')).toBe(true);
    expect(isRequestStatusTransitionAllowed('NEW_REQUEST', '')).toBe(false);
  });

  it('lists every status when there is no current one', () => {
    expect(getAllowedNextRequestStatuses('')).toEqual(ALL_STATUSES);
  });

  it('limits dropdown options with stepsOnly and keeps the current first', () => {
    expect(getRequestStatusDropdownOptions(null, 'ORDERED', { stepsOnly: true }).map((o) => o.value)).toEqual([
      'ORDERED',
      'DELIVERED',
      'EXCEPTION',
    ]);
    expect(getRequestStatusDropdownOptions(null, 'ORDERED').map((o) => o.value)).toEqual(ALL_STATUSES);
  });
});
