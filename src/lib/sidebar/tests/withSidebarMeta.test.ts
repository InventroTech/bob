import { describe, expect, it } from 'vitest';
import { SIDEBAR_META_TYPE, splitSidebarMeta, withSidebarMeta } from '../sidebarGroups';
import { metaEntry, tableEntry } from './fixtures';

const countMeta = (config: unknown[]) =>
  config.filter((e) => (e as { type?: string })?.type === SIDEBAR_META_TYPE).length;

describe('withSidebarMeta', () => {
  it('adds the sidebar entry when a group is set', () => {
    expect(withSidebarMeta([tableEntry], { group: 'Inventory', section: 'Stock' })).toEqual([
      tableEntry,
      metaEntry('Inventory', 'Stock'),
    ]);
  });

  it('adds the sidebar entry with an empty section when only a group is set', () => {
    expect(withSidebarMeta([tableEntry], { group: 'Inventory', section: '' })).toEqual([
      tableEntry,
      metaEntry('Inventory', ''),
    ]);
  });

  it('trims spaces before saving', () => {
    expect(withSidebarMeta([tableEntry], { group: '  Inventory ', section: ' Stock ' })).toEqual([
      tableEntry,
      metaEntry('Inventory', 'Stock'),
    ]);
  });

  it('does not add an entry when the group is empty', () => {
    expect(withSidebarMeta([tableEntry], { group: '', section: 'Stock' })).toEqual([tableEntry]);
  });

  it('does not add an entry when the group is only spaces', () => {
    expect(withSidebarMeta([tableEntry], { group: '   ', section: 'Stock' })).toEqual([tableEntry]);
  });

  it('removes an old entry when the group is cleared', () => {
    expect(withSidebarMeta([tableEntry, metaEntry('Old')], { group: '', section: '' })).toEqual([tableEntry]);
  });

  it('replaces an old entry instead of adding a second one', () => {
    const saved = withSidebarMeta([metaEntry('Old'), tableEntry], { group: 'New', section: '' });
    expect(countMeta(saved)).toBe(1);
    expect(saved).toContainEqual(metaEntry('New', ''));
  });

  it('works with an empty canvas', () => {
    expect(withSidebarMeta([], { group: 'Inventory', section: '' })).toEqual([metaEntry('Inventory', '')]);
  });

  it('round-trips with splitSidebarMeta', () => {
    const saved = withSidebarMeta([tableEntry], { group: 'Procurement', section: 'Requests' });
    expect(splitSidebarMeta(saved)).toEqual({
      components: [tableEntry],
      meta: { group: 'Procurement', section: 'Requests' },
    });
  });
});
