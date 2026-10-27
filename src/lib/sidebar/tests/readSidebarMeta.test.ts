import { describe, expect, it } from 'vitest';
import { readSidebarMeta } from '../sidebarGroups';
import { metaEntry, tableEntry } from './fixtures';

describe('readSidebarMeta', () => {
  it('returns empty group and section when config has no sidebar entry', () => {
    expect(readSidebarMeta([tableEntry])).toEqual({ group: '', section: '' });
  });

  it('returns empty values when config is null', () => {
    expect(readSidebarMeta(null)).toEqual({ group: '', section: '' });
  });

  it('returns empty values when config is undefined', () => {
    expect(readSidebarMeta(undefined)).toEqual({ group: '', section: '' });
  });

  it('returns empty values when config is an object instead of a list', () => {
    expect(readSidebarMeta({})).toEqual({ group: '', section: '' });
  });

  it('returns empty values for an empty list', () => {
    expect(readSidebarMeta([])).toEqual({ group: '', section: '' });
  });

  it('reads group and section', () => {
    expect(readSidebarMeta([tableEntry, metaEntry('Procurement', 'Requests')])).toEqual({
      group: 'Procurement',
      section: 'Requests',
    });
  });

  it('trims spaces around group and section', () => {
    expect(readSidebarMeta([metaEntry('  Procurement ', ' Requests ')])).toEqual({
      group: 'Procurement',
      section: 'Requests',
    });
  });

  it('returns an empty section when only a group is set', () => {
    expect(readSidebarMeta([metaEntry('Inventory')])).toEqual({ group: 'Inventory', section: '' });
  });

  it('handles a sidebar entry with no config object', () => {
    expect(readSidebarMeta([{ type: 'sidebarMeta' }])).toEqual({ group: '', section: '' });
  });

  it('ignores null items in the config list', () => {
    expect(readSidebarMeta([null, metaEntry('Inventory', 'Stock')])).toEqual({
      group: 'Inventory',
      section: 'Stock',
    });
  });
});
