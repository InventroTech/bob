import { useEffect, useState } from 'react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export const DELETE_REASON_MAX_LENGTH = 500;

export interface PendingDelete {
  email: string;
  uid: string;
  name?: string;
}

interface DeleteUserDialogProps {
  user: PendingDelete | null;
  onCancel: () => void;
  /** Called with the trimmed reason, or undefined when none was given. */
  onConfirm: (reason: string | undefined) => Promise<void>;
}

export function DeleteUserDialog({ user, onCancel, onConfirm }: DeleteUserDialogProps) {
  const [reason, setReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setReason('');
      setDeleting(false);
    }
  }, [user]);

  const confirm = async () => {
    setDeleting(true);
    try {
      await onConfirm(reason.trim() || undefined);
    } catch {
      // onConfirm reports its own errors; keep the dialog open so the admin can retry.
    } finally {
      setDeleting(false);
    }
  };

  const who = user?.name?.trim() ? `${user.name} (${user?.email})` : user?.email;

  return (
    <AlertDialog
      open={!!user}
      onOpenChange={(open) => {
        if (!open && !deleting) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete user?</AlertDialogTitle>
          <AlertDialogDescription>
            {who} will be signed out everywhere and removed from this organization. They will appear
            under Deleted users with today&apos;s date and your name.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="delete-user-reason">Reason (optional)</Label>
          <Textarea
            id="delete-user-reason"
            value={reason}
            maxLength={DELETE_REASON_MAX_LENGTH}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Left the company, duplicate account"
            disabled={deleting}
          />
          <p className="text-right text-xs text-muted-foreground">
            {reason.length}/{DELETE_REASON_MAX_LENGTH}
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button type="button" variant="destructive" onClick={() => void confirm()} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete user'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
