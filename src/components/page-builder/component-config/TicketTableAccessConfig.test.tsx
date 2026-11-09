import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TicketTableAccessConfig } from './TicketTableAccessConfig';

const getRoles = vi.fn();

vi.mock('@/lib/api/services/membership', () => ({
  membershipService: { getRoles: (...args: unknown[]) => getRoles(...args) },
}));

describe('TicketTableAccessConfig', () => {
  beforeEach(() => {
    getRoles.mockReset();
    getRoles.mockResolvedValue([
      { id: 'role-cse', key: 'CSE', name: 'CSE' },
      { id: 'role-gm', key: 'GM', name: 'GM' },
    ]);
  });

  it('turns the setting on from the switch', () => {
    const handleInputChange = vi.fn();
    render(<TicketTableAccessConfig localConfig={{}} handleInputChange={handleInputChange} />);

    fireEvent.click(screen.getByRole('switch', { name: 'Show tickets only after filters are applied' }));

    expect(handleInputChange).toHaveBeenCalledWith('requireFiltersBeforeShowing', true);
  });

  it('hides the role picker while the setting is off', () => {
    render(<TicketTableAccessConfig localConfig={{}} handleInputChange={vi.fn()} />);

    expect(screen.queryByText('Apply to roles')).toBeNull();
  });

  it('saves the ticked roles when the setting is on', async () => {
    const handleInputChange = vi.fn();
    render(
      <TicketTableAccessConfig
        localConfig={{ requireFiltersBeforeShowing: true, requireFiltersRoles: [] }}
        handleInputChange={handleInputChange}
      />,
    );

    fireEvent.click(await screen.findByRole('checkbox', { name: 'CSE' }));

    expect(handleInputChange).toHaveBeenCalledWith('requireFiltersRoles', ['CSE']);
  });

  it('unticks a role that was already selected', async () => {
    const handleInputChange = vi.fn();
    render(
      <TicketTableAccessConfig
        localConfig={{ requireFiltersBeforeShowing: true, requireFiltersRoles: ['CSE', 'GM'] }}
        handleInputChange={handleInputChange}
      />,
    );

    fireEvent.click(await screen.findByRole('checkbox', { name: 'CSE' }));

    expect(handleInputChange).toHaveBeenCalledWith('requireFiltersRoles', ['GM']);
  });
});
