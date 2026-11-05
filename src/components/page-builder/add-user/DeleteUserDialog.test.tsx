import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DELETE_REASON_MAX_LENGTH, DeleteUserDialog, type PendingDelete } from './DeleteUserDialog';

const asha: PendingDelete = { email: 'asha@praja.in', uid: 'uid-1', name: 'Asha Rao' };

const renderDialog = (props: Partial<React.ComponentProps<typeof DeleteUserDialog>> = {}) => {
  const onCancel = vi.fn();
  const onConfirm = vi.fn().mockResolvedValue(undefined);
  const utils = render(<DeleteUserDialog user={asha} onCancel={onCancel} onConfirm={onConfirm} {...props} />);
  return { ...utils, onCancel, onConfirm };
};

const reasonBox = () => screen.getByLabelText('Reason (optional)') as HTMLTextAreaElement;
const deleteButton = () => screen.getByRole('button', { name: /delete user|deleting/i });

describe('DeleteUserDialog', () => {
  it('is hidden when no user is waiting to be deleted', () => {
    renderDialog({ user: null });

    expect(screen.queryByText('Delete user?')).toBeNull();
  });

  it('names the user being deleted', () => {
    renderDialog();

    expect(screen.getByText('Delete user?')).toBeTruthy();
    expect(screen.getByText(/Asha Rao \(asha@praja\.in\)/)).toBeTruthy();
  });

  it('shows just the email when the user has no name', () => {
    renderDialog({ user: { email: 'noname@praja.in', uid: 'u' } });

    expect(screen.getByText(/noname@praja\.in will be signed out/)).toBeTruthy();
  });

  it('deletes without a reason', async () => {
    const { onConfirm } = renderDialog();

    fireEvent.click(deleteButton());

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(undefined));
  });

  it('sends the typed reason, trimmed', async () => {
    const { onConfirm } = renderDialog();

    fireEvent.change(reasonBox(), { target: { value: '  Left the company  ' } });
    fireEvent.click(deleteButton());

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('Left the company'));
  });

  it('treats a reason of only spaces as no reason', async () => {
    const { onConfirm } = renderDialog();

    fireEvent.change(reasonBox(), { target: { value: '    ' } });
    fireEvent.click(deleteButton());

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(undefined));
  });

  it('limits the reason to 500 characters and shows the count', () => {
    renderDialog();

    expect(reasonBox().maxLength).toBe(DELETE_REASON_MAX_LENGTH);
    fireEvent.change(reasonBox(), { target: { value: 'abc' } });
    expect(screen.getByText(`3/${DELETE_REASON_MAX_LENGTH}`)).toBeTruthy();
  });

  it('Cancel closes without deleting', () => {
    const { onCancel, onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows Deleting… and locks the buttons while the delete runs', async () => {
    let finish: () => void = () => {};
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    renderDialog({ onConfirm });

    fireEvent.click(deleteButton());

    expect(await screen.findByRole('button', { name: 'Deleting…' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true);
    expect(reasonBox().disabled).toBe(true);
    finish();
    expect(await screen.findByRole('button', { name: 'Delete user' })).toBeTruthy();
  });

  it('does not delete twice on a double click', async () => {
    let finish: () => void = () => {};
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    renderDialog({ onConfirm });

    fireEvent.click(deleteButton());
    await screen.findByRole('button', { name: 'Deleting…' });
    fireEvent.click(deleteButton());

    expect(onConfirm).toHaveBeenCalledTimes(1);
    finish();
  });

  it('can be used again after a failed delete', async () => {
    const onConfirm = vi.fn().mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce(undefined);
    renderDialog({ onConfirm });

    fireEvent.click(deleteButton());
    expect(await screen.findByRole('button', { name: 'Delete user' })).toBeTruthy();
    fireEvent.click(deleteButton());

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(2));
  });

  it('clears the reason when opened for another user', () => {
    const { rerender, onCancel, onConfirm } = renderDialog();
    fireEvent.change(reasonBox(), { target: { value: 'Old reason' } });

    rerender(<DeleteUserDialog user={null} onCancel={onCancel} onConfirm={onConfirm} />);
    rerender(
      <DeleteUserDialog user={{ email: 'ravi@praja.in', uid: 'u2' }} onCancel={onCancel} onConfirm={onConfirm} />
    );

    expect(reasonBox().value).toBe('');
  });
});
