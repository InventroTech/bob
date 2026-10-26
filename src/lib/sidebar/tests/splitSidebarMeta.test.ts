import { describe, expect, it } from 'vitest';
import { splitSidebarMeta } from '../sidebarGroups';
import { metaEntry, tableEntry } from './fixtures';

describe('splitSidebarMeta', () => {
  it('removes the sidebar entry from the canvas components', () => {
    const { components } = splitSidebarMeta([tableEntry, metaEntry('Inventory', 'Stock')]);
    expect(components).toEqual([tableEntry]);
  });

  it('returns the group and section that were removed', () => {
    const { meta } = splitSidebarMeta([tableEntry, metaEntry('Inventory', 'Stock')]);
    expect(meta).toEqual({ group: 'Inventory', section: 'Stock' });
  });

  it('keeps every component when there is no sidebar entry', () => {
    const other = { id: 'chart-1', type: 'barGraph' };
    const { components, meta } = splitSidebarMeta([tableEntry, other]);
    expect(components).toEqual([tableEntry, other]);
    expect(meta).toEqual({ group: '', section: '' });
  });

  it('keeps component order', () => {
    const a = { id: 'a', type: 'leadTable' };
    const b = { id: 'b', type: 'barGraph' };
    const { components } = splitSidebarMeta([a, metaEntry('X'), b]);
    expect(components).toEqual([a, b]);
  });

  it('returns no components and empty values for non-list config', () => {
    expect(splitSidebarMeta(null)).toEqual({ components: [], meta: { group: '', section: '' } });
    expect(splitSidebarMeta({})).toEqual({ components: [], meta: { group: '', section: '' } });
  });
});
