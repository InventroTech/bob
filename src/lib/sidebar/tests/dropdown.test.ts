import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SidebarGroupFlyout } from '@/layout/SidebarGroupFlyout';
import { page } from './fixtures';

const ACTIVE = 'active-class';

const sections = [
  { name: 'Requests', pages: [page('new-request'), page('my-requests')] },
  { name: 'Items', pages: [page('delivered-items')] },
];

type FlyoutProps = React.ComponentProps<typeof SidebarGroupFlyout>;

const renderGroup = (props: Partial<FlyoutProps> = {}, initialPath = '/app/acme/pages/new-request') =>
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

const heading = (name: RegExp = /procurement/i) => screen.getByRole('button', { name });

describe('SidebarGroupFlyout (dropdown)', () => {
  it('shows the group name', () => {
    renderGroup();
    expect(heading()).toBeTruthy();
  });

  it('starts closed with no pages visible', () => {
    renderGroup();
    expect(screen.queryByText('new-request')).toBeNull();
    expect(screen.queryByText('Requests')).toBeNull();
  });

  it('is not highlighted while closed, even on one of its pages', () => {
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
  });

  it('links each page to its page URL', () => {
    renderGroup();
    fireEvent.click(heading());
    expect(screen.getByText('my-requests').closest('a')?.getAttribute('href')).toBe('/app/acme/pages/my-requests');
  });

  it('highlights the page that is currently open', () => {
    renderGroup();
    fireEvent.click(heading());
    expect(screen.getByText('new-request').closest('a')?.className).toContain(ACTIVE);
    expect(screen.getByText('my-requests').closest('a')?.className).not.toContain(ACTIVE);
  });

  it('stays open after clicking a page', () => {
    renderGroup();
    fireEvent.click(heading());
    fireEvent.click(screen.getByText('my-requests'));
    expect(screen.getByText('delivered-items')).toBeTruthy();
  });

  it('does not show a heading for a section with no name', () => {
    renderGroup(
      { name: 'Inventory', sections: [{ name: '', pages: [page('dashboard')] }], renderIcon: () => null },
      '/'
    );
    fireEvent.click(heading(/inventory/i));
    expect(screen.getByText('dashboard')).toBeTruthy();
    expect(screen.getAllByText(/./).some((el) => el.tagName === 'P')).toBe(false);
  });

  it('shows the first page icon instead of the name when the sidebar is collapsed', () => {
    renderGroup({ collapsed: true, inline: false });
    expect(screen.queryByText('Procurement')).toBeNull();
    expect(screen.getByTestId('icon').textContent).toBe('Sparkles');
  });
});
