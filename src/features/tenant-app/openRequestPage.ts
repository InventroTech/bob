export type OpenRequestPageRef = { id: string; name?: string | null };

const LIST_PAGE_NAMES = [
  'all requests',
  'all request',
  'my requests',
  'pending approvals',
];

/** When an email deep-link includes record_id, land on a request list, not New Request. */
export function pickOpenRequestPage<T extends OpenRequestPageRef>(
  pages: T[],
  options?: { search?: string; excludeId?: string },
): T | null {
  const excludeId = options?.excludeId;
  const eligible = pages.filter((page) => page.id && page.id !== excludeId);
  if (!eligible.length) return null;

  const recordId = new URLSearchParams(options?.search || '').get('record_id')?.trim();
  if (!recordId) return eligible[0];

  const norm = (name?: string | null) => String(name || '').trim().toLowerCase();
  for (const preferred of LIST_PAGE_NAMES) {
    const match = eligible.find((page) => norm(page.name) === preferred);
    if (match) return match;
  }
  const notForm = eligible.find((page) => !norm(page.name).includes('new request'));
  return notForm || eligible[0];
}

export function withCurrentSearch(path: string, search: string): string {
  if (!search) return path;
  return `${path}${search.startsWith('?') ? search : `?${search}`}`;
}
