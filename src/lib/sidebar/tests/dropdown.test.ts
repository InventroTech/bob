import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SidebarGroupFlyout } from '@/layout/SidebarGroupFlyout';
import { page } from './fixtures';

const ACTIVE = 'active-class';
const OUTSIDE_PAGE = '/app/acme/pages/home';
const GROUP_PAGE = '/app/acme/pages/new-request';

const sections = [
  { name: 'Requests', pages: [page('new-request'), page('my-requests')] },
  { name: 'Items', pages: [page('delivered-items')] },
];

type FlyoutProps = React.ComponentProps<typeof SidebarGroupFlyout>;

const renderGroup = (props: Partial<FlyoutProps> = {}, initialPath = OUTSIDE_PAGE) =>
  render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [initialPath] },
      React.createElement(SidebarGroupFlyout, {
        name: 'Procurement',
        sections,
        tenantSlug: 'acme',
        collapsed: false,
        inline: true,
        activeClass: ACTIVE,
        triggerPadClass: '',
        renderIcon: (icon: string) => React.createElement('span', { 'data-testid': 'icon' }, icon),
        ...props,
      } as FlyoutProps)
    )
  );

const renderCollapsed = (initialPath = OUTSIDE_PAGE) => renderGroup({ collapsed: true, inline: false }, initialPath);

const heading = (name: RegExp = /procurement/i) => screen.getByRole('button', { name });

describe('SidebarGroupFlyout (dropdown)', () => {
  it('shows the group name', () => {
    renderGroup();
    expect(heading()).toBeTruthy();
  });

  it('starts closed when the current page is outside the group', () => {
    renderGroup();
    expect(screen.queryByText('new-request')).toBeNull();
    expect(screen.queryByText('Requests')).toBeNull();
    expect(heading().getAttribute('aria-expanded')).toBe('false');
  });

  it('is not highlighted while closed on a page outside the group', () => {
    renderGroup();
    expect(heading().className).not.toContain(ACTIVE);
  });

  it('opens on click and shows sections and pages', () => {
    renderGroup();
    fireEvent.click(heading());
    expect(screen.getByText('Requests')).toBeTruthy();
    expect(screen.getByText('Items')).toBeTruthy();
    expect(screen.getByText('new-request')).toBeTruthy();
    expect(screen.getByText('my-requests')).toBeTruthy();
    expect(screen.getByText('delivered-items')).toBeTruthy();
    expect(heading().getAttribute('aria-expanded')).toBe('true');
  });

  it('is highlighted while open', () => {
    renderGroup();
    fireEvent.click(heading());
    expect(heading().className).toContain(ACTIVE);
  });

  it('closes on a second click', () => {
    renderGroup();
    fireEvent.click(heading());
    fireEvent.click(heading());
    expect(screen.queryByText('new-request')).toBeNull();
    expect(heading().className).not.toContain(ACTIVE);
    expect(heading().getAttribute('aria-expanded')).toBe('false');
  });

  it('links each page to its page URL', () => {
    renderGroup();
    fireEvent.click(heading());
    expect(screen.getByText('my-requests').closest('a')?.getAttribute('href')).toBe('/app/acme/pages/my-requests');
  });

  it('opens and highlights on load when the current page is in the group (refresh or direct link)', () => {
    renderGroup({}, GROUP_PAGE);
    expect(heading().getAttribute('aria-expanded')).toBe('true');
    expect(heading().className).toContain(ACTIVE);
    expect(screen.getByText('new-request').closest('a')?.className).toContain(ACTIVE);
    expect(screen.getByText('my-requests').closest('a')?.className).not.toContain(ACTIVE);
  });

  it('stays highlighted after being closed while on one of its pages', () => {
    renderGroup({}, GROUP_PAGE);
    fireEvent.click(heading());
    expect(screen.queryByText('new-request')).toBeNull();
    expect(heading().className).toContain(ACTIVE);
  });

  it('stays open after clicking a page', () => {
    renderGroup();
    fireEvent.click(heading());
    fireEvent.click(screen.getByText('my-requests'));
    expect(screen.getByText('delivered-items')).toBeTruthy();
    expect(screen.getByText('my-requests').closest('a')?.className).toContain(ACTIVE);
  });

  it('does not show a heading for a section with no name', () => {
    renderGroup({ name: 'Inventory', sections: [{ name: '', pages: [page('dashboard')] }], renderIcon: () => null });
    fireEvent.click(heading(/inventory/i));
    expect(screen.getByText('dashboard')).toBeTruthy();
    expect(screen.getAllByText(/./).some((el) => el.tagName === 'P')).toBe(false);
  });

  it('collapsed: shows the first page icon with the group name as its accessible name', () => {
    renderCollapsed();
    expect(screen.queryByText('Procurement')).toBeNull();
    expect(screen.getByTestId('icon').textContent).toBe('Sparkles');
    expect(heading().getAttribute('aria-label')).toBe('Procurement');
  });

  it('collapsed: highlights on one of its pages without opening the popover', () => {
    renderCollapsed(GROUP_PAGE);
    expect(heading().className).toContain(ACTIVE);
    expect(heading().getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('new-request')).toBeNull();
  });

  it('collapsed: stays highlighted after choosing a page closes the popover', () => {
    renderCollapsed();
    fireEvent.click(heading());
    expect(heading().getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByText('my-requests'));
    expect(screen.queryByText('my-requests')).toBeNull();
    expect(heading().getAttribute('aria-expanded')).toBe('false');
    expect(heading().className).toContain(ACTIVE);
  });
});
