/** Resolve the Page Builder redirect target after creating a request. No auth/network. */

export type PostCreatePage = {
  id: string;
  name: string;
  header_title?: string | null;
  icon_name?: string | null;
};

const GENERIC_ICONS = new Set(['sparkles', 'file', 'circle', 'layout']);

export function normalizePageName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function isNewRequestPageName(name: string): boolean {
  const n = normalizePageName(name);
  return n.includes('new request') || n.includes('create request') || n === 'new';
}

/** "Settings page" and "Settings" should both match the Settings sidebar item. */
export function redirectQueries(preferredName: string | undefined): string[] {
  const preferred = preferredName ? normalizePageName(preferredName) : '';
  if (!preferred) return [];
  const stripped = preferred.replace(/\s+pages?$/, '').trim();
  if (stripped && stripped !== preferred) return [preferred, stripped];
  return [preferred];
}

function pageMatchKeys(page: PostCreatePage): string[] {
  const icon = normalizePageName(String(page.icon_name || '').replace(/Icon$/i, ''));
  const keys = [page.name, page.header_title].map((v) => normalizePageName(String(v || '')));
  if (icon && !GENERIC_ICONS.has(icon)) keys.push(icon);
  return [...new Set(keys.filter(Boolean))];
}

function pageMatchesQuery(page: PostCreatePage, query: string): boolean {
  if (!query) return false;
  const keys = pageMatchKeys(page);
  for (const key of keys) {
    if (key === query) return true;
    if (key.includes(query)) return true;
    if (query.length >= 6 && key.length >= 6 && query.includes(key)) return true;
  }
  return false;
}

function pickPreferredPageId(
  pages: PostCreatePage[],
  preferredName: string | undefined,
  currentPageId?: string | null
): string | null {
  const queries = redirectQueries(preferredName);
  if (!queries.length) return null;

  const matches = pages.filter((p) => queries.some((query) => pageMatchesQuery(p, query)));
  if (!matches.length) return null;

  const notForm = matches.find(
    (p) => p.id !== currentPageId && !isNewRequestPageName(p.name)
  );
  if (notForm) return notForm.id;

  const notCurrent = matches.find((p) => p.id !== currentPageId);
  return notCurrent?.id ?? matches[0].id;
}

/**
 * After create: only the Page Builder `redirectAfterSubmitPageName` is used.
 * Matches sidebar page name, Header Title, or icon (e.g. Settings).
 */
export function pickPostCreatePageId(
  pages: PostCreatePage[],
  preferredName: string | undefined,
  currentPageId?: string | null
): string | null {
  if (!pages.length) return null;
  return pickPreferredPageId(pages, preferredName, currentPageId);
}
