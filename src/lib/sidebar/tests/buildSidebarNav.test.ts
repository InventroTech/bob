import { describe, expect, it } from 'vitest';
import { buildSidebarNav, type SidebarNavItem, type SidebarPage } from '../sidebarGroups';
import { page } from './fixtures';

const labels = (nav: SidebarNavItem<SidebarPage>[]) =>
  nav.map((i) => (i.kind === 'page' ? i.page.id : `group:${i.name}`));

const groupAt = (nav: SidebarNavItem<SidebarPage>[], index: number) => {
  const item = nav[index];
  if (item?.kind !== 'group') throw new Error(`expected a group at index ${index}`);
  return item;
};

describe('buildSidebarNav', () => {
  it('returns an empty list when there are no pages', () => {
    expect(buildSidebarNav([])).toEqual([]);
  });

  it('keeps ungrouped pages as plain links in the same order', () => {
    expect(labels(buildSidebarNav([page('a'), page('b'), page('c')]))).toEqual(['a', 'b', 'c']);
  });

  it('treats pages without config as plain links', () => {
    const nav = buildSidebarNav([{ id: 'x', name: 'x', icon_name: 'Sparkles' }]);
    expect(nav).toEqual([{ kind: 'page', page: { id: 'x', name: 'x', icon_name: 'Sparkles' } }]);
  });

  it('puts pages with the same group under one heading', () => {
    const nav = buildSidebarNav([page('new', 'Procurement', 'Requests'), page('mine', 'Procurement', 'Requests')]);
    expect(labels(nav)).toEqual(['group:Procurement']);
    expect(groupAt(nav, 0).sections[0].pages.map((p) => p.id)).toEqual(['new', 'mine']);
  });

  it('creates one heading per different group', () => {
    const nav = buildSidebarNav([page('a', 'Procurement', 'Requests'), page('b', 'Inventory', 'Stock')]);
    expect(labels(nav)).toEqual(['group:Procurement', 'group:Inventory']);
  });

  it('places a group where its first page would have been', () => {
    const nav = buildSidebarNav([
      page('home'),
      page('new', 'Procurement', 'Requests'),
      page('settings'),
      page('approved', 'Procurement', 'Items'),
    ]);
    expect(labels(nav)).toEqual(['home', 'group:Procurement', 'settings']);
  });

  it('keeps sections in the order their first page appears', () => {
    const nav = buildSidebarNav([
      page('new', 'Procurement', 'Requests'),
      page('approved', 'Procurement', 'Items'),
      page('mine', 'Procurement', 'Requests'),
    ]);
    expect(groupAt(nav, 0).sections.map((s) => [s.name, s.pages.map((p) => p.id)])).toEqual([
      ['Requests', ['new', 'mine']],
      ['Items', ['approved']],
    ]);
  });

  it('matches group names regardless of capital letters and keeps the first spelling', () => {
    const nav = buildSidebarNav([page('a', 'Inventory', 'Stock'), page('b', 'INVENTORY', 'Stock')]);
    expect(nav).toHaveLength(1);
    expect(groupAt(nav, 0).name).toBe('Inventory');
  });

  it('matches section names regardless of capital letters and keeps the first spelling', () => {
    const nav = buildSidebarNav([page('a', 'Inventory', 'Stock'), page('b', 'Inventory', 'stock')]);
    const sections = groupAt(nav, 0).sections;
    expect(sections).toHaveLength(1);
    expect(sections[0].name).toBe('Stock');
    expect(sections[0].pages.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('puts grouped pages without a section into an unnamed section', () => {
    const nav = buildSidebarNav([page('dash', 'Inventory'), page('items', 'Inventory', 'Stock')]);
    expect(groupAt(nav, 0).sections.map((s) => s.name)).toEqual(['', 'Stock']);
  });

  it('keeps every page exactly once', () => {
    const pages = [
      page('a'),
      page('b', 'Procurement', 'Requests'),
      page('c', 'Inventory'),
      page('d', 'Procurement', 'Items'),
      page('e'),
    ];
    const ids = buildSidebarNav(pages).flatMap((i) =>
      i.kind === 'page' ? [i.page.id] : i.sections.flatMap((s) => s.pages.map((p) => p.id))
    );
    expect(ids.sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('keeps the original page object (icon, name, extra fields)', () => {
    const original = { ...page('x', 'Inventory', 'Stock', 'Box'), display_order: 7 };
    const nav = buildSidebarNav([original]);
    expect(groupAt(nav, 0).sections[0].pages[0]).toBe(original);
  });
});
