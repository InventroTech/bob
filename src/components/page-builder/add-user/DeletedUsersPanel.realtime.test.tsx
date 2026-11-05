import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DeletedUser } from '@/lib/api/services/deletedUsers';
import { dispatchRecordUpdated, getRealtimeSubscriberCount } from '@/lib/realtime/recordUpdatedBus';
import {
  DELETED_USER_REALTIME_ENTITY,
  DELETED_USERS_LIVE_DEBOUNCE_MS,
  DeletedUsersPanel,
} from './DeletedUsersPanel';

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
  manager_name: '',
  manager_email: '',
  created_at: null,
  deleted_at: '2026-11-04T10:00:00Z',
  deleted_by: 'gm@praja.in',
  deletion_reason: '',
  ...overrides,
});

const someoneDeleted = (entityType = DELETED_USER_REALTIME_ENTITY) =>
  act(() => {
    dispatchRecordUpdated({
      event: 'record_updated',
      entity_type: entityType,
      record_id: `${entityType}:42`,
      created: false,
      data: { deleted: true },
    });
  });

const waitForDebounce = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(DELETED_USERS_LIVE_DEBOUNCE_MS);
  });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  getDeletedUsers.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DeletedUsersPanel live updates', () => {
  it('adds a user deleted elsewhere without reopening the popup', async () => {
    getDeletedUsers.mockResolvedValueOnce([user()]);
    render(<DeletedUsersPanel />);
    await screen.findByText('asha@praja.in');

    getDeletedUsers.mockResolvedValueOnce([
      user({ id: 'log-2', email: 'ravi@praja.in', deleted_by: 'admin@praja.in' }),
      user(),
    ]);
    someoneDeleted();
    await waitForDebounce();

    expect(await screen.findByText('ravi@praja.in')).toBeTruthy();
    expect(screen.getByText('2 deleted users')).toBeTruthy();
  });

  it('reloads once for a burst of deletes', async () => {
    getDeletedUsers.mockResolvedValue([user()]);
    render(<DeletedUsersPanel />);
    await screen.findByText('asha@praja.in');

    someoneDeleted();
    someoneDeleted();
    someoneDeleted();
    await waitForDebounce();

    await waitFor(() => expect(getDeletedUsers).toHaveBeenCalledTimes(2));
  });

  it('ignores updates for leads and tickets', async () => {
    getDeletedUsers.mockResolvedValue([user()]);
    render(<DeletedUsersPanel />);
    await screen.findByText('asha@praja.in');

    someoneDeleted('lead');
    someoneDeleted('support_ticket');
    await waitForDebounce();

    expect(getDeletedUsers).toHaveBeenCalledTimes(1);
  });

  it('keeps the current list without a loading flash while it reloads', async () => {
    getDeletedUsers.mockResolvedValueOnce([user()]);
    render(<DeletedUsersPanel />);
    await screen.findByText('asha@praja.in');

    getDeletedUsers.mockReturnValueOnce(new Promise(() => {}));
    someoneDeleted();
    await waitForDebounce();

    expect(screen.queryByText('Loading deleted users…')).toBeNull();
    expect(screen.getByText('asha@praja.in')).toBeTruthy();
  });

  it('keeps the current list if a live reload fails', async () => {
    getDeletedUsers.mockResolvedValueOnce([user()]);
    render(<DeletedUsersPanel />);
    await screen.findByText('asha@praja.in');

    getDeletedUsers.mockRejectedValueOnce(new Error('offline'));
    someoneDeleted();
    await waitForDebounce();

    await waitFor(() => expect(getDeletedUsers).toHaveBeenCalledTimes(2));
    expect(screen.getByText('asha@praja.in')).toBeTruthy();
    expect(screen.queryByText('Could not load deleted users. Please try again.')).toBeNull();
  });

  it('recovers from a failed first load when a live update arrives', async () => {
    getDeletedUsers.mockRejectedValueOnce(new Error('offline'));
    render(<DeletedUsersPanel />);
    await screen.findByText('Could not load deleted users. Please try again.');

    getDeletedUsers.mockResolvedValueOnce([user()]);
    someoneDeleted();
    await waitForDebounce();

    expect(await screen.findByText('asha@praja.in')).toBeTruthy();
  });

  it('keeps the live connection open only while the list is showing', async () => {
    getDeletedUsers.mockResolvedValue([]);
    const before = getRealtimeSubscriberCount();
    const { unmount } = render(<DeletedUsersPanel />);

    expect(getRealtimeSubscriberCount()).toBe(before + 1);
    unmount();
    expect(getRealtimeSubscriberCount()).toBe(before);
  });

  it('stops listening once the popup is closed', async () => {
    getDeletedUsers.mockResolvedValue([user()]);
    const { unmount } = render(<DeletedUsersPanel />);
    await screen.findByText('asha@praja.in');
    unmount();

    someoneDeleted();
    await waitForDebounce();

    expect(getDeletedUsers).toHaveBeenCalledTimes(1);
  });
});
