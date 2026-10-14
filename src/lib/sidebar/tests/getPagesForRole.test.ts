import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSidebarNav } from '../sidebarGroups';
import { metaEntry, tableEntry } from './fixtures';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ apiClient: { get } }));

import { pageService } from '@/lib/api/services/pageService';

const apiPage = (id: string, config: unknown) => ({
  id,
  name: id,
  display_order: 1,
  icon_name: 'Box',
  header_title: id,
  config,
});

describe('pageService.getPagesForRole', () => {
  beforeEach(() => get.mockReset());

  it('asks the backend for the role preview list', async () => {
    get.mockResolvedValue({ data: [] });
    await pageService.getPagesForRole('tenant-1', 'role-1');
    expect(get).toHaveBeenCalledWith('/pages/', {
      params: { tenant_id: 'tenant-1', role_id: 'role-1', role_preview: '1' },
    });
  });

  it('passes the sidebar entry from config through', async () => {
    get.mockResolvedValue({ data: [apiPage('stock', [tableEntry, metaEntry('Inventory', 'Stock')])] });
    const [result] = await pageService.getPagesForRole('t', 'r');
    expect(result.config).toEqual([metaEntry('Inventory', 'Stock')]);
  });

  it('does not keep the canvas components in the list', async () => {
    get.mockResolvedValue({ data: [apiPage('stock', [tableEntry, metaEntry('Inventory')])] });
    const [result] = await pageService.getPagesForRole('t', 'r');
    expect(result.config).not.toContainEqual(tableEntry);
  });

  it('returns an empty config for pages without a group or without config', async () => {
    get.mockResolvedValue({ data: [apiPage('plain', [tableEntry]), apiPage('slim', undefined)] });
    const results = await pageService.getPagesForRole('t', 'r');
    expect(results.map((p) => p.config)).toEqual([[], []]);
  });

  it('reads paginated "results" responses too', async () => {
    get.mockResolvedValue({ data: { results: [apiPage('stock', [metaEntry('Inventory')])] } });
    const [result] = await pageService.getPagesForRole('t', 'r');
    expect(result.config).toEqual([metaEntry('Inventory')]);
  });

  it('gives buildSidebarNav enough to build a group', async () => {
    get.mockResolvedValue({
      data: [
        apiPage('new', [tableEntry, metaEntry('Procurement', 'Requests')]),
        apiPage('mine', [tableEntry, metaEntry('Procurement', 'Requests')]),
      ],
    });
    const nav = buildSidebarNav(await pageService.getPagesForRole('t', 'r'));
    expect(nav).toHaveLength(1);
    expect(nav[0]).toMatchObject({ kind: 'group', name: 'Procurement' });
  });
});
