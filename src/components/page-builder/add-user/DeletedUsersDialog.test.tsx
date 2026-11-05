import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DeletedUser } from '@/lib/api/services/deletedUsers';
import { DeletedUsersDialog } from './DeletedUsersDialog';

const getDeletedUsers = vi.fn();

vi.mock('@/lib/api/services/deletedUsers', () => ({
  deletedUsersService: { list: () => getDeletedUsers() },
}));

const user = (overrides: Partial<DeletedUser> = {}): DeletedUser => ({
  id: 'log-1',
  name: 'Asha Rao',
  email: 'asha@praja.in',
  role_id: 'role-1',
  role_name: 'RM',
  manager_name: 'Big Boss',
  manager_email: 'boss@praja.in',
  created_at: '2026-01-05T04:30:00Z',
  deleted_at: '2026-11-04T10:00:00Z',
  deleted_by: 'admin@praja.in',
  deletion_reason: 'Left the company',
  ...overrides,
});

const openButton = () => screen.getByRole('button', { name: /deleted users/i });

beforeEach(() => {
  getDeletedUsers.mockReset();
  getDeletedUsers.mockResolvedValue([user()]);
});

describe('DeletedUsersDialog', () => {
  it('shows a Deleted users button and keeps the popup closed', () => {
    render(<DeletedUsersDialog />);

    expect(openButton()).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(getDeletedUsers).not.toHaveBeenCalled();
  });

  it('opens a popup with the deleted users when clicked', async () => {
    render(<DeletedUsersDialog />);

    fireEvent.click(openButton());

    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Deleted users' })).toBeTruthy();
    expect(await screen.findByText('Asha Rao')).toBeTruthy();
    expect(screen.getByText('Left the company')).toBeTruthy();
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeTruthy();
  });

  it('searches inside the popup', async () => {
    getDeletedUsers.mockResolvedValue([
      user({ id: 'log-1', name: 'Asha' }),
      user({ id: 'log-2', name: 'Ravi', email: 'ravi@praja.in', deletion_reason: 'Duplicate account' }),
    ]);
    render(<DeletedUsersDialog />);
    fireEvent.click(openButton());
    await screen.findByText('Asha');

    fireEvent.change(screen.getByLabelText('Search deleted users'), { target: { value: 'duplicate' } });

    expect(screen.queryByText('Asha')).toBeNull();
    expect(screen.getByText('Ravi')).toBeTruthy();
  });

  it('closes with the close button', async () => {
    render(<DeletedUsersDialog />);
    fireEvent.click(openButton());
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('closes with Escape', async () => {
    render(<DeletedUsersDialog />);
    fireEvent.click(openButton());
    const dialog = await screen.findByRole('dialog');

    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('loads the list fresh every time it is opened', async () => {
    render(<DeletedUsersDialog />);
    fireEvent.click(openButton());
    await screen.findByText('Asha Rao');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    getDeletedUsers.mockResolvedValue([user({ id: 'log-2', name: 'Ravi', email: 'ravi@praja.in' })]);
    fireEvent.click(openButton());

    expect(await screen.findByText('Ravi')).toBeTruthy();
    expect(getDeletedUsers).toHaveBeenCalledTimes(2);
  });

  it('clears the search when closed', async () => {
    render(<DeletedUsersDialog />);
    fireEvent.click(openButton());
    await screen.findByText('Asha Rao');
    fireEvent.change(screen.getByLabelText('Search deleted users'), { target: { value: 'zzz' } });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(openButton());

    expect(((await screen.findByLabelText('Search deleted users')) as HTMLInputElement).value).toBe('');
  });

  it('opens from a custom trigger, like the Deleted option in the users toggle', async () => {
    render(<DeletedUsersDialog trigger={<button type="button">Deleted</button>} />);

    expect(screen.queryByRole('button', { name: /deleted users/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Deleted' }));

    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(await screen.findByText('Asha Rao')).toBeTruthy();
  });

  it('shows the empty message when nobody has been deleted', async () => {
    getDeletedUsers.mockResolvedValue([]);
    render(<DeletedUsersDialog />);

    fireEvent.click(openButton());

    expect(await screen.findByText('No deleted users yet')).toBeTruthy();
  });

  it('shows the error message when the list cannot be loaded', async () => {
    getDeletedUsers.mockRejectedValue(new Error('Network Error'));
    render(<DeletedUsersDialog />);

    fireEvent.click(openButton());

    expect(await screen.findByText('Could not load deleted users. Please try again.')).toBeTruthy();
  });
});
