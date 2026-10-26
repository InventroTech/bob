import { describe, expect, it } from 'vitest';
import { stripSidebarMeta } from '../sidebarGroups';
import { metaEntry, tableEntry } from './fixtures';

describe('stripSidebarMeta', () => {
  it('removes the sidebar entry so only real components are rendered', () => {
    expect(stripSidebarMeta([tableEntry, metaEntry('Inventory', 'Stock')])).toEqual([tableEntry]);
  });

  it('keeps every component and their order when there is no sidebar entry', () => {
    const chart = { id: 'chart-1', type: 'barGraph' };
    expect(stripSidebarMeta([tableEntry, chart])).toEqual([tableEntry, chart]);
  });

  it('returns non-list config unchanged', () => {
    expect(stripSidebarMeta(null)).toBeNull();
    expect(stripSidebarMeta(undefined)).toBeUndefined();
  });
});
