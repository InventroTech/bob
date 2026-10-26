import { describe, expect, it } from 'vitest';
import { readSidebarMeta, sidebarMetaOnly } from '../sidebarGroups';
import { metaEntry, tableEntry } from './fixtures';

describe('sidebarMetaOnly', () => {
  it('keeps only the sidebar entry and drops the canvas components', () => {
    expect(sidebarMetaOnly([tableEntry, { id: 'chart', type: 'barGraph' }, metaEntry('Inventory', 'Stock')])).toEqual([
      metaEntry('Inventory', 'Stock'),
    ]);
  });

  it('returns an empty list when the page has no group', () => {
    expect(sidebarMetaOnly([tableEntry])).toEqual([]);
  });

  it('returns an empty list for non-list config', () => {
    expect(sidebarMetaOnly(null)).toEqual([]);
    expect(sidebarMetaOnly({})).toEqual([]);
  });

  it('still reads back the same group and section', () => {
    expect(readSidebarMeta(sidebarMetaOnly([tableEntry, metaEntry('Procurement', 'Requests')]))).toEqual({
      group: 'Procurement',
      section: 'Requests',
    });
  });
});
