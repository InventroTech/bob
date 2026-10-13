/**
 * Sidebar grouping is stored per page as a non-rendering entry inside `pages.config`,
 * so no database column is needed. CustomAppPage skips it because no component
 * is registered for its type.
 */
export const SIDEBAR_META_TYPE = 'sidebarMeta';

export interface SidebarMeta {
  group: string;
  section: string;
}

export interface SidebarPage {
  id: string;
  name: string;
  icon_name: string;
  display_order?: number;
  config?: unknown;
}

export interface SidebarSection<P extends SidebarPage = SidebarPage> {
  name: string;
  pages: P[];
}

export type SidebarNavItem<P extends SidebarPage = SidebarPage> =
  | { kind: 'page'; page: P }
  | { kind: 'group'; name: string; sections: SidebarSection<P>[] };

type ConfigEntry = { type?: unknown; config?: Record<string, unknown> | null };

const EMPTY_META: SidebarMeta = { group: '', section: '' };

function isMetaEntry(entry: unknown): entry is ConfigEntry {
  return Boolean(entry) && (entry as ConfigEntry).type === SIDEBAR_META_TYPE;
}

export function readSidebarMeta(config: unknown): SidebarMeta {
  if (!Array.isArray(config)) return EMPTY_META;
  const entry = config.find(isMetaEntry);
  if (!entry) return EMPTY_META;
  return {
    group: String(entry.config?.group ?? '').trim(),
    section: String(entry.config?.section ?? '').trim(),
  };
}

/** Separate the sidebar entry from the canvas components when loading a page into the builder. */
export function splitSidebarMeta<T>(config: unknown): { components: T[]; meta: SidebarMeta } {
  if (!Array.isArray(config)) return { components: [], meta: EMPTY_META };
  return {
    components: config.filter((entry) => !isMetaEntry(entry)) as T[],
    meta: readSidebarMeta(config),
  };
}

/** Put the sidebar entry back on save; omitted entirely when the page has no group. */
export function withSidebarMeta<T>(components: T[], meta: SidebarMeta): Array<T | Record<string, unknown>> {
  const rest = components.filter((entry) => !isMetaEntry(entry));
  const group = meta.group.trim();
  if (!group) return rest;
  return [
    ...rest,
    {
      id: SIDEBAR_META_TYPE,
      type: SIDEBAR_META_TYPE,
      props: {},
      config: { group, section: meta.section.trim() },
    },
  ];
}

/**
 * Groups pages (already sorted by display_order) for the sidebar. A group sits where its
 * first page would have been; sections keep the order their first page appears in.
 * Pages without a group stay as plain links.
 */
export function buildSidebarNav<P extends SidebarPage>(pages: P[]): SidebarNavItem<P>[] {
  const items: SidebarNavItem<P>[] = [];
  const groups = new Map<string, Extract<SidebarNavItem<P>, { kind: 'group' }>>();

  for (const page of pages) {
    const { group, section } = readSidebarMeta(page.config);
    if (!group) {
      items.push({ kind: 'page', page });
      continue;
    }
    const groupKey = group.toLowerCase();
    let groupItem = groups.get(groupKey);
    if (!groupItem) {
      groupItem = { kind: 'group', name: group, sections: [] };
      groups.set(groupKey, groupItem);
      items.push(groupItem);
    }
    const sectionKey = section.toLowerCase();
    let sectionItem = groupItem.sections.find((s) => s.name.toLowerCase() === sectionKey);
    if (!sectionItem) {
      sectionItem = { name: section, pages: [] };
      groupItem.sections.push(sectionItem);
    }
    sectionItem.pages.push(page);
  }

  return items;
}
