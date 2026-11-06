import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DeletedUser } from '@/lib/api/services/deletedUsers';
import { DeletedUsersPanel } from './DeletedUsersPanel';

const getDeletedUsers = vi.fn();
const downloadDeletedUsersPdf = vi.fn();

vi.mock('@/lib/api/services/deletedUsers', () => ({
  deletedUsersService: { list: () => getDeletedUsers() },
}));

vi.mock('./deletedUsersPdf', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./deletedUsersPdf')>()),
  downloadDeletedUsersPdf: (...args: unknown[]) => downloadDeletedUsersPdf(...args),
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

beforeEach(() => {
  getDeletedUsers.mockReset();
  downloadDeletedUsersPdf.mockReset();
});

describe('DeletedUsersPanel', () => {
  it('shows a loading message first', () => {
    getDeletedUsers.mockReturnValue(new Promise(() => {}));
    render(<DeletedUsersPanel />);

    expect(screen.getByText('Loading deleted users…')).toBeTruthy();
  });

  it('shows every column for a deleted user', async () => {
    getDeletedUsers.mockResolvedValue([user()]);
    render(<DeletedUsersPanel />);

    expect(await screen.findByText('Asha Rao')).toBeTruthy();
    for (const header of ['Name', 'Email', 'Role', 'Manager', 'Account created', 'Deleted at', 'Deleted by', 'Reason']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeTruthy();
    }
    expect(screen.getByText('asha@praja.in')).toBeTruthy();
    expect(screen.getByText('RM')).toBeTruthy();
    expect(screen.getByText('Big Boss')).toBeTruthy();
    expect(screen.getByText('admin@praja.in')).toBeTruthy();
    expect(screen.getByText('Left the company')).toBeTruthy();
    expect(screen.getAllByText(/2026/).length).toBeGreaterThanOrEqual(2);
  });

  it('shows the manager email when the manager has no name', async () => {
    getDeletedUsers.mockResolvedValue([user({ manager_name: '', manager_email: 'boss@praja.in' })]);
    render(<DeletedUsersPanel />);

    expect(await screen.findByText('boss@praja.in')).toBeTruthy();
  });

  it('shows placeholders for missing details', async () => {
    getDeletedUsers.mockResolvedValue([
      user({ name: '', manager_name: null, manager_email: null, deletion_reason: null, deleted_by: null, role_name: null }),
    ]);
    render(<DeletedUsersPanel />);

    expect(await screen.findByText('Not recorded')).toBeTruthy();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
  });

  it('counts the deleted users', async () => {
    getDeletedUsers.mockResolvedValue([user({ id: 'log-1' }), user({ id: 'log-2', email: 'b@praja.in' })]);
    render(<DeletedUsersPanel />);

    expect(await screen.findByText('2 deleted users')).toBeTruthy();
  });

  it('uses the singular for one deleted user', async () => {
    getDeletedUsers.mockResolvedValue([user()]);
    render(<DeletedUsersPanel />);

    expect(await screen.findByText('1 deleted user')).toBeTruthy();
  });

  it('says so when nobody has been deleted', async () => {
    getDeletedUsers.mockResolvedValue([]);
    render(<DeletedUsersPanel />);

    expect(await screen.findByText('No deleted users yet')).toBeTruthy();
    expect((screen.getByRole('button', { name: /download pdf/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows an error when the list cannot be loaded', async () => {
    getDeletedUsers.mockRejectedValue(new Error('Network Error'));
    render(<DeletedUsersPanel />);

    expect(await screen.findByText('Could not load deleted users. Please try again.')).toBeTruthy();
  });

  it('filters by name, email, role, manager, deleted by and reason', async () => {
    getDeletedUsers.mockResolvedValue([
      user({ id: 'log-1', name: 'Asha', email: 'asha@praja.in', deletion_reason: 'Left the company' }),
      user({ id: 'log-2', name: 'Ravi', email: 'ravi@praja.in', deletion_reason: 'Duplicate account', deleted_by: 'ops@praja.in' }),
    ]);
    const { rerender } = render(<DeletedUsersPanel searchTerm="" />);
    await screen.findByText('Asha');

    for (const term of ['ravi', 'RAVI@PRAJA', 'duplicate', 'ops@']) {
      rerender(<DeletedUsersPanel searchTerm={term} />);
      expect(screen.queryByText('Asha')).toBeNull();
      expect(screen.getByText('Ravi')).toBeTruthy();
    }
  });

  it('says so when the search matches nobody', async () => {
    getDeletedUsers.mockResolvedValue([user()]);
    render(<DeletedUsersPanel searchTerm="zzz" />);

    expect(await screen.findByText('No deleted users match your search')).toBeTruthy();
  });

  it('downloads only the users shown by the search', async () => {
    const asha = user({ id: 'log-1', name: 'Asha' });
    const ravi = user({ id: 'log-2', name: 'Ravi', email: 'ravi@praja.in' });
    getDeletedUsers.mockResolvedValue([asha, ravi]);
    render(<DeletedUsersPanel searchTerm="ravi" />);
    await screen.findByText('Ravi');

    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));

    expect(downloadDeletedUsersPdf).toHaveBeenCalledWith([ravi]);
  });

  it('turns the download button black when pressed', async () => {
    getDeletedUsers.mockResolvedValue([user()]);
    render(<DeletedUsersPanel />);
    await screen.findByText('Asha Rao');

    const button = screen.getByRole('button', { name: /download pdf/i });
    expect(button.className).toContain('active:bg-black');
    expect(button.className).toContain('active:text-white');
  });

  it('keeps the download button black and blocks double clicks while the PDF is made', async () => {
    let finish: () => void = () => {};
    downloadDeletedUsersPdf.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    getDeletedUsers.mockResolvedValue([user()]);
    render(<DeletedUsersPanel />);
    await screen.findByText('Asha Rao');
    const button = screen.getByRole('button', { name: /download pdf/i }) as HTMLButtonElement;

    fireEvent.click(button);
    await waitFor(() => expect(button.disabled).toBe(true));
    expect(button.className).toMatch(/(^|\s)bg-black(\s|$)/);
    expect(button.getAttribute('aria-busy')).toBe('true');
    fireEvent.click(button);
    expect(downloadDeletedUsersPdf).toHaveBeenCalledTimes(1);

    finish();
    await waitFor(() => expect(button.disabled).toBe(false));
    expect(button.className).not.toMatch(/(^|\s)bg-black(\s|$)/);
  });

  it('has no CSV download any more', async () => {
    getDeletedUsers.mockResolvedValue([user()]);
    render(<DeletedUsersPanel />);
    await screen.findByText('Asha Rao');

    expect(screen.queryByRole('button', { name: /download csv/i })).toBeNull();
  });

  it('disables the PDF download when the search matches nobody', async () => {
    getDeletedUsers.mockResolvedValue([user()]);
    render(<DeletedUsersPanel searchTerm="nobody" />);
    await screen.findByText('No deleted users match your search');

    expect((screen.getByRole('button', { name: /download pdf/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('reloads when the refresh key changes', async () => {
    getDeletedUsers.mockResolvedValue([]);
    const { rerender } = render(<DeletedUsersPanel refreshKey={0} />);
    await screen.findByText('No deleted users yet');

    getDeletedUsers.mockResolvedValue([user()]);
    rerender(<DeletedUsersPanel refreshKey={1} />);

    expect(await screen.findByText('Asha Rao')).toBeTruthy();
    expect(getDeletedUsers).toHaveBeenCalledTimes(2);
  });

  it('does not reload when only the search changes', async () => {
    getDeletedUsers.mockResolvedValue([user()]);
    const { rerender } = render(<DeletedUsersPanel searchTerm="" />);
    await screen.findByText('Asha Rao');

    rerender(<DeletedUsersPanel searchTerm="asha" />);

    await waitFor(() => expect(getDeletedUsers).toHaveBeenCalledTimes(1));
  });
});
