import { useEffect, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRecordUpdated } from '@/hooks/useRecordUpdated';
import { cn } from '@/lib/utils';
import { deletedUsersService, type DeletedUser } from '@/lib/api/services/deletedUsers';
import { downloadDeletedUsersPdf, formatLogDate } from './deletedUsersPdf';

/** Sent by the backend over the tenant websocket whenever a user is deleted. */
export const DELETED_USER_REALTIME_ENTITY = 'tenant_membership';
/** Several deletes in a row reload the list once. */
export const DELETED_USERS_LIVE_DEBOUNCE_MS = 500;

interface DeletedUsersPanelProps {
  /** Filters by name, email, role, manager, deleted by or reason. */
  searchTerm?: string;
  /** Change to reload, e.g. right after a user is deleted. */
  refreshKey?: number;
}

const matches = (user: DeletedUser, term: string) =>
  [user.name, user.email, user.role_name, user.manager_name, user.manager_email, user.deleted_by, user.deletion_reason]
    .some((value) => String(value ?? '').toLowerCase().includes(term));

export function DeletedUsersPanel({ searchTerm = '', refreshKey = 0 }: DeletedUsersPanelProps) {
  const [users, setUsers] = useState<DeletedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveTick, setLiveTick] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const shownOnce = useRef(false);

  useRecordUpdated(() => setLiveTick((tick) => tick + 1), {
    entityType: DELETED_USER_REALTIME_ENTITY,
    debounceMs: DELETED_USERS_LIVE_DEBOUNCE_MS,
  });

  useEffect(() => {
    let cancelled = false;
    const quiet = shownOnce.current;
    if (!quiet) {
      setLoading(true);
      setError(null);
    }
    deletedUsersService
      .list()
      .then((rows) => {
        if (cancelled) return;
        shownOnce.current = true;
        setUsers(rows);
        setError(null);
      })
      .catch(() => {
        if (!cancelled && !quiet) setError('Could not load deleted users. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey, liveTick]);

  const term = searchTerm.trim().toLowerCase();
  const visible = useMemo(() => (term ? users.filter((user) => matches(user, term)) : users), [users, term]);

  const download = async () => {
    setDownloading(true);
    try {
      await downloadDeletedUsersPdf(visible);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading deleted users…</div>;
  }
  if (error) {
    return <div className="py-8 text-center text-destructive">{error}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {visible.length} deleted user{visible.length === 1 ? '' : 's'}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={download}
          disabled={visible.length === 0 || downloading}
          aria-busy={downloading}
          className={cn(
            'active:bg-black active:text-white',
            downloading && 'bg-black text-white hover:bg-black hover:text-white disabled:opacity-100'
          )}
        >
          <Download className="mr-2 h-4 w-4" aria-hidden />
          Download PDF
        </Button>
      </div>

      {users.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No deleted users yet</div>
      ) : visible.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No deleted users match your search</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Account created</TableHead>
                <TableHead>Deleted at</TableHead>
                <TableHead>Deleted by</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name || '—'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role_name || '—'}</TableCell>
                  <TableCell>{user.manager_name || user.manager_email || '—'}</TableCell>
                  <TableCell>{formatLogDate(user.created_at) || '—'}</TableCell>
                  <TableCell>{formatLogDate(user.deleted_at) || '—'}</TableCell>
                  <TableCell>{user.deleted_by || 'Not recorded'}</TableCell>
                  <TableCell className="max-w-xs whitespace-pre-wrap break-words">{user.deletion_reason || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
