import { describe, expect, it } from 'vitest';
import { pickPostCreatePageId } from './useInventoryRequestForm';

const pages = [
  { id: 'new', name: 'New Request', header_title: 'Create Request' },
  { id: 'mine', name: 'My Request', header_title: 'My Requests' },
  { id: 'all', name: 'All Request', header_title: 'All Requests' },
  { id: 'pending', name: 'Pending Approval', header_title: '' },
];

describe('pickPostCreatePageId', () => {
  it('uses the Page Builder redirect name', () => {
    expect(pickPostCreatePageId(pages, 'All Request', 'new')).toBe('all');
  });

  it('matches Header Title when it differs from the sidebar name', () => {
    expect(pickPostCreatePageId(pages, 'All Requests', 'new')).toBe('all');
  });

  it('matches All Request(s) even when the config spelling differs', () => {
    expect(pickPostCreatePageId(pages, 'All Requests', 'new')).toBe('all');
    expect(pickPostCreatePageId(pages, 'all request', 'new')).toBe('all');
  });

  it('does not fall back to a hardcoded My Request page', () => {
    expect(pickPostCreatePageId(pages, undefined, 'new')).toBeNull();
    expect(pickPostCreatePageId(pages, '  ', 'new')).toBeNull();
    expect(pickPostCreatePageId(pages, 'Does Not Exist', 'new')).toBeNull();
  });

  it('does not stay on the New Request form when the configured name is similar', () => {
    expect(pickPostCreatePageId(pages, 'My Requests', 'new')).toBe('mine');
  });
});
