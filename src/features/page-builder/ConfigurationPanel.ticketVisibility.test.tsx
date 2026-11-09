import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfigurationPanel } from './ConfigurationPanel';
import type { CanvasComponentData, ComponentConfig } from './componentMap';

vi.mock('@/lib/api/services/membership', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/services/membership')>();
  return {
    ...actual,
    membershipService: {
      ...actual.membershipService,
      getRoles: vi.fn().mockResolvedValue([{ id: 'role-cse', key: 'CSE', name: 'CSE' }]),
    },
  };
});

const renderPanel = (type: string, config: ComponentConfig = {}) => {
  const setCanvasComponents = vi.fn();
  const selectedComponent: CanvasComponentData = { id: 'comp-1', type, props: {}, config };
  render(
    <ConfigurationPanel
      selectedComponent={selectedComponent}
      setCanvasComponents={setCanvasComponents}
      onClose={vi.fn()}
    />,
  );
  return setCanvasComponents;
};

describe('ConfigurationPanel Ticket Visibility', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the Ticket Visibility card for ticket tables', () => {
    renderPanel('ticketTable');

    expect(screen.getByText('Ticket Visibility')).toBeTruthy();
  });

  it('does not show the Ticket Visibility card for other tables', () => {
    renderPanel('leadTable');

    expect(screen.queryByText('Ticket Visibility')).toBeNull();
  });

  it('saves the setting into the component config', async () => {
    const setCanvasComponents = renderPanel('ticketTable');

    fireEvent.click(screen.getByRole('switch', { name: 'Show tickets only after filters are applied' }));
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    const update = setCanvasComponents.mock.calls.at(-1)?.[0] as (prev: CanvasComponentData[]) => CanvasComponentData[];
    const [saved] = update([{ id: 'comp-1', type: 'ticketTable', props: {}, config: {} }]);
    expect((saved.config as Record<string, unknown>).requireFiltersBeforeShowing).toBe(true);
  });
});
