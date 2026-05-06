'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import { apiClient, membershipService } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

type AssignableUser = {
  id: string;
  userUuid: string;
  name: string;
  email: string;
  roleName: string;
};

interface AssignLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadRecord: any | null;
  updateBasePath: string;
  title?: string;
  description?: string;
  onSaved?: (recordId: number) => Promise<void> | void;
}

export const AssignLeadModal: React.FC<AssignLeadModalProps> = ({
  open,
  onOpenChange,
  leadRecord,
  updateBasePath,
  title,
  description,
  onSaved,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<AssignableUser[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const parsed: AssignableUser[] = await membershipService.getActiveUsersForAssignment();
        if (!cancelled) {
          setUsers(parsed);
        }
      } catch (error: any) {
        if (!cancelled) {
          setUsers([]);
          toast({
            title: 'Unable to load users',
            description: error?.message || 'Failed to load active users',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    };
    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [open, toast]);

  const filteredUsers = useMemo(() => {
    if (!debouncedSearch) return users;
    return users.filter((u) => {
      const haystack = `${u.name} ${u.email} ${u.roleName}`.toLowerCase();
      return haystack.includes(debouncedSearch);
    });
  }, [users, debouncedSearch]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  const handleSave = async () => {
    if (!leadRecord?.id) return;
    if (!selectedUser) {
      toast({ title: 'Select a user first', description: 'Choose one assignee from the list.' });
      return;
    }

    try {
      setSaving(true);
      const recordId = Number(leadRecord.id);
      const existingData = (leadRecord?.data || {}) as Record<string, unknown>;
      const nowIso = new Date().toISOString();
      const todayDate = nowIso.slice(0, 10);
      const isBlankValue = (value: unknown) => {
        if (value == null) return true;
        if (typeof value !== 'string') return false;
        const normalized = value.trim().toLowerCase();
        return normalized === '' || normalized === 'null' || normalized === 'none';
      };
      const firstAssignedAt = existingData.first_assigned_at;
      const firstAssignedTo = existingData.first_assigned_to;
      const assignedBy =
        user?.id ||
        (typeof existingData.assigned_by === 'string' && existingData.assigned_by.trim() ? existingData.assigned_by : null);
      const payload = {
        data: {
          ...existingData,
          assigned_to: selectedUser.userUuid,
          lead_stage: 'ASSIGNED',
          assigned_by: assignedBy,
          ...(isBlankValue(firstAssignedAt) ? { first_assigned_at: nowIso } : {}),
          ...(isBlankValue(firstAssignedTo) ? { first_assigned_to: selectedUser.userUuid } : {}),
          first_assigned_today_at: nowIso,
          first_assignment_today_date: todayDate,
        },
      };
      await apiClient.patch(`${updateBasePath}/${recordId}/`, payload);
      toast({
        title: 'Lead assigned',
        description: `${selectedUser.name} is now assigned to this lead.`,
      });
      if (onSaved) await onSaved(recordId);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Assignment failed',
        description: error?.message || 'Unable to assign lead.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title || 'Assign Lead'}</DialogTitle>
          <DialogDescription>
            {description || 'Select an active user to assign this lead.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, email, or role..."
              className="pl-9"
            />
          </div>

          <div className="h-80 overflow-auto rounded-md border">
            {loadingUsers ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 7 }).map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-md border px-3 py-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                    <Skeleton className="ml-3 h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No active users found.</div>
            ) : (
              filteredUsers.map((user) => {
                const selected = selectedUserId === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={`flex w-full items-center justify-between border-b px-4 py-3 text-left last:border-b-0 ${
                      selected ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{user.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                    </div>
                    {user.roleName ? <Badge variant="outline">{user.roleName}</Badge> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !selectedUser || !leadRecord?.id}>
            {saving ? 'Saving...' : 'Assign lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

