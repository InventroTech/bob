import { describe, expect, it } from 'vitest';
import { isFilterVisible, shouldShowFilter, type RmPrdAnalyticsConfig } from './RmPrdAnalyticsComponent';

describe('isFilterVisible', () => {
  it('defaults to visible when config is undefined', () => {
    expect(isFilterVisible(undefined, 'manager')).toBe(true);
  });

  it('defaults to visible when visibleFilters is unset', () => {
    const config: RmPrdAnalyticsConfig = {};
    expect(isFilterVisible(config, 'leadGroup')).toBe(true);
  });

  it('defaults to visible when the specific key is absent from visibleFilters', () => {
    // a config that only ever mentions the filter it wants hidden must not
    // silently hide every other filter it never mentioned
    const config: RmPrdAnalyticsConfig = { visibleFilters: { party: false } };
    expect(isFilterVisible(config, 'state')).toBe(true);
  });

  it('is false only when explicitly set to false', () => {
    const config: RmPrdAnalyticsConfig = { visibleFilters: { party: false } };
    expect(isFilterVisible(config, 'party')).toBe(false);
  });

  it('is true when explicitly set to true', () => {
    const config: RmPrdAnalyticsConfig = { visibleFilters: { party: true } };
    expect(isFilterVisible(config, 'party')).toBe(true);
  });
});

describe('shouldShowFilter', () => {
  it('hides Manager in RM view even if visibleFilters explicitly enables it', () => {
    // scoping the fetch to one RM makes filtering by manager name meaningless —
    // this must win over the config toggle, not just the default
    const config: RmPrdAnalyticsConfig = { visibleFilters: { manager: true } };
    expect(shouldShowFilter(config, 'manager', true)).toBe(false);
  });

  it('shows Manager in manager view by default', () => {
    expect(shouldShowFilter(undefined, 'manager', false)).toBe(true);
  });

  it('still respects visibleFilters for every other key in RM view', () => {
    const config: RmPrdAnalyticsConfig = { visibleFilters: { party: false } };
    expect(shouldShowFilter(config, 'party', true)).toBe(false);
    expect(shouldShowFilter(config, 'state', true)).toBe(true);
  });
});
