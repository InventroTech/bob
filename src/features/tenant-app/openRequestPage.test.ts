import { describe, expect, it } from 'vitest';
import { pickOpenRequestPage, withCurrentSearch } from './openRequestPage';

const pages = [
  { id: 'form', name: 'New Request' },
  { id: 'mine', name: 'My Requests' },
  { id: 'all', name: 'All Requests' },
];

describe('pickOpenRequestPage', () => {
  it('keeps the first page when the link is not for a specific request', () => {
    expect(pickOpenRequestPage(pages)?.id).toBe('form');
  });

  it('opens a request list instead of the new request form when record_id is present', () => {
    expect(pickOpenRequestPage(pages, { search: '?record_id=2289577' })?.id).toBe('all');
  });

  it('keeps the query string on the redirected page', () => {
    expect(withCurrentSearch('/app/unmannd/pages/all', '?record_id=2289577')).toBe(
      '/app/unmannd/pages/all?record_id=2289577',
    );
  });
});
