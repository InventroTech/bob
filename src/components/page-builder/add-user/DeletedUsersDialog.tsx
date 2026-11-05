import { useState, type ReactNode } from 'react';
import { Search, UserX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { DeletedUsersPanel } from './DeletedUsersPanel';

interface DeletedUsersDialogProps {
  /** Change to reload the list, e.g. right after a user is deleted. */
  refreshKey?: number;
  className?: string;
  /** Element that opens the popup (must accept a ref and onClick); defaults to a "Deleted users" button. */
  trigger?: ReactNode;
}

export function DeletedUsersDialog({ refreshKey = 0, className, trigger }: DeletedUsersDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" className={cn('h-9 gap-2', className)}>
            <UserX className="h-4 w-4" aria-hidden />
            Deleted users
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Deleted users</DialogTitle>
          <DialogDescription>
            Users removed from this organization, with who removed them, when and why.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, role, manager, deleted by or reason..."
            aria-label="Search deleted users"
            className="pl-9"
          />
        </div>
        {/* Mounted only while open, so the list is fetched fresh each time. */}
        <DeletedUsersPanel searchTerm={search} refreshKey={refreshKey} />
      </DialogContent>
    </Dialog>
  );
}
