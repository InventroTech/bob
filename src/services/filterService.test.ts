import { describe, expect, it } from 'vitest';
import { FilterService, parseFilterValuesFromUrl } from './filterService';
import type { FilterConfig } from '@/component-config/DynamicFilterConfig';
import { DEFAULT_PRICE_RANGE_PRESETS, DEFAULT_RELATIVE_DATE_PRESETS, formatLocalYmd, resolveRelativeDateRange } from '@/lib/filters/rangePresets';

const costFilter: FilterConfig = {
  key: 'estimated_cost',
  label: 'Estimated Cost',
  type: 'number_range',
  accessor: 'estimated_cost',
  rangePresets: DEFAULT_PRICE_RANGE_PRESETS,
};

const dateFilter: FilterConfig = {
  key: 'request_date',
  label: 'Date Range',
  type: 'date_range',
  accessor: 'request_date',
  relativeDatePresets: DEFAULT_RELATIVE_DATE_PRESETS,
};

describe('FilterService number_range and date_range', () => {
  it('sends estimated_cost min and max as gte/lte', () => {
    const service = new FilterService([costFilter]);
    const params = service.generateQueryParams({
      estimated_cost: { min: '100', max: '500' },
    });
    expect(params.get('estimated_cost__gte')).toBe('100');
    expect(params.get('estimated_cost__lte')).toBe('500');
  });

  it('sends only the first selected price bucket', () => {
    const service = new FilterService([costFilter]);
    const params = service.generateQueryParams({
      estimated_cost: ['0-500', '1000-5000'],
    });
    expect(params.get('estimated_cost__gte')).toBe('0');
    expect(params.get('estimated_cost__lte')).toBe('500');
  });

  it('sends only the first selected date preset', () => {
    const service = new FilterService([dateFilter]);
    const params = service.generateQueryParams({
      request_date: ['last_3_days', 'last_7_days'],
    });
    const expected = resolveRelativeDateRange(DEFAULT_RELATIVE_DATE_PRESETS[0]);
    expect(params.get('request_date__gte')).toBe(formatLocalYmd(expected.start));
    expect(params.get('request_date__lte')).toBe(formatLocalYmd(expected.end));
  });

  it('sends only min when max is empty', () => {
    const service = new FilterService([{ ...costFilter, rangePresets: undefined }]);
    const params = service.generateQueryParams({
      estimated_cost: { min: '250', max: '' },
    });
    expect(params.get('estimated_cost__gte')).toBe('250');
    expect(params.get('estimated_cost__lte')).toBeNull();
  });

  it('sends date range as accessor gte/lte', () => {
    const service = new FilterService([{ ...dateFilter, relativeDatePresets: undefined }]);
    const params = service.generateQueryParams({
      request_date: {
        start: new Date(2026, 0, 10),
        end: new Date(2026, 0, 20),
      },
    });
    expect(params.get('request_date__gte')).toBe('2026-01-10');
    expect(params.get('request_date__lte')).toBe('2026-01-20');
  });

  it('sends last 7 days as local gte/lte including today', () => {
    const service = new FilterService([dateFilter]);
    const params = service.generateQueryParams({
      request_date: { preset: 'last_7_days' },
    });
    const expected = resolveRelativeDateRange(DEFAULT_RELATIVE_DATE_PRESETS[1]);
    expect(params.get('request_date__gte')).toBe(formatLocalYmd(expected.start));
    expect(params.get('request_date__lte')).toBe(formatLocalYmd(expected.end));
  });
});

describe('parseFilterValuesFromUrl', () => {
  it('restores number_range bucket from gte/lte params', () => {
    const values = parseFilterValuesFromUrl(
      [costFilter],
      new URLSearchParams('estimated_cost__gte=500&estimated_cost__lte=1000')
    );
    expect(values.estimated_cost).toEqual(['500-1000']);
  });

  it('restores date_range from gte/lte params even without accessor key', () => {
    const values = parseFilterValuesFromUrl(
      [{ ...dateFilter, relativeDatePresets: undefined }],
      new URLSearchParams('request_date__gte=2026-03-01&request_date__lte=2026-03-31')
    );
    expect(values.request_date.start).toBeInstanceOf(Date);
    expect(values.request_date.end).toBeInstanceOf(Date);
  });
});
