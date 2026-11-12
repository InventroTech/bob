import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';

import type { DeletedUser } from '@/lib/api/services/deletedUsers';
import { DownloadDeletedUsersButton } from './DownloadDeletedUsersButton';

const listDeletedUsers = vi.fn();
const downloadDeletedUsersPdf = vi.fn();

vi.mock('@/lib/api/services/deletedUsers', () => ({
  deletedUsersService: { list: () => listDeletedUsers() },
}));
vi.mock('./deletedUsersPdf', () => ({
  downloadDeletedUsersPdf: (...args: unknown[]) => downloadDeletedUsersPdf(...args),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const user = (overrides: Partial<DeletedUser> = {}): DeletedUser => ({
  id: 'log-1',
  name: 'Asha Rao',
  email: 'asha@praja.in',
  role_id: 'role-1',
  role_name: 'RM',
  manager_name: '',
  manager_email: '',
  created_at: null,
  deleted_at: '2026-11-04T10:00:00Z',
  deleted_by: 'admin@praja.in',
  ...overrides,
});

const button = () => screen.getByRole('button', { name: /deleted users|generating/i }) as HTMLButtonElement;

beforeEach(() => {
  listDeletedUsers.mockReset();
  downloadDeletedUsersPdf.mockReset().mockResolvedValue(undefined);
  vi.mocked(toast.error).mockReset();
});

describe('DownloadDeletedUsersButton', () => {
  it('shows "Deleted Users"', () => {
    render(<DownloadDeletedUsersButton />);

    expect(button().textContent).toContain('Deleted Users');
    expect(button().disabled).toBe(false);
  });

  it('downloads every deleted user as a PDF', async () => {
    const users = [user(), user({ id: 'log-2', email: 'ravi@praja.in' })];
    listDeletedUsers.mockResolvedValue(users);
    render(<DownloadDeletedUsersButton />);

    fireEvent.click(button());

    await waitFor(() => expect(downloadDeletedUsersPdf).toHaveBeenCalledWith(users));
    expect(listDeletedUsers).toHaveBeenCalledTimes(1);
  });

  it('fetches a fresh list on every click', async () => {
    listDeletedUsers.mockResolvedValueOnce([user()]).mockResolvedValueOnce([user(), user({ id: 'log-2' })]);
    render(<DownloadDeletedUsersButton />);

    fireEvent.click(button());
    await waitFor(() => expect(button().disabled).toBe(false));
    fireEvent.click(button());

    await waitFor(() => expect(downloadDeletedUsersPdf).toHaveBeenCalledTimes(2));
    expect(downloadDeletedUsersPdf.mock.calls[1][0]).toHaveLength(2);
  });

  it('passes an empty list through, so the PDF helper can say there is nobody to download', async () => {
    listDeletedUsers.mockResolvedValue([]);
    render(<DownloadDeletedUsersButton />);

    fireEvent.click(button());

    await waitFor(() => expect(downloadDeletedUsersPdf).toHaveBeenCalledWith([]));
  });

  it('shows an error and downloads nothing when the list cannot be loaded', async () => {
    listDeletedUsers.mockRejectedValue(new Error('500'));
    render(<DownloadDeletedUsersButton />);

    fireEvent.click(button());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not load deleted users. Please try again.'));
    expect(downloadDeletedUsersPdf).not.toHaveBeenCalled();
    await waitFor(() => expect(button().disabled).toBe(false));
  });

  it('turns black, says "Generating…" and blocks double clicks while working', async () => {
    let finish: (users: DeletedUser[]) => void = () => {};
    listDeletedUsers.mockReturnValue(new Promise<DeletedUser[]>((resolve) => { finish = resolve; }));
    render(<DownloadDeletedUsersButton />);

    fireEvent.click(button());
    await waitFor(() => expect(button().disabled).toBe(true));
    expect(button().textContent).toContain('Generating…');
    expect(button().className).toMatch(/(^|\s)bg-black(\s|$)/);
    expect(button().getAttribute('aria-busy')).toBe('true');
    fireEvent.click(button());
    expect(listDeletedUsers).toHaveBeenCalledTimes(1);

    finish([user()]);
    await waitFor(() => expect(button().disabled).toBe(false));
    expect(button().textContent).toContain('Deleted Users');
    expect(button().className).not.toMatch(/(^|\s)bg-black(\s|$)/);
  });

  it('uses the styles it is given, to match the Download PDF button', () => {
    render(<DownloadDeletedUsersButton className="h-11 border-black" iconClassName="mr-2 h-4 w-4" />);

    expect(button().className).toContain('h-11');
    expect(button().className).toContain('border-black');
    expect(button().querySelector('svg')?.getAttribute('class')).toContain('mr-2');
  });
});
