import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { rmActivityApi, type RmDailyTargetOverrideDto } from '@/lib/api/services/rmActivity';

interface RmDailyTargetOverridesDialogProps {
  tenantMembershipId: number | null;
  rmName: string;
  open: boolean;
  onClose: () => void;
}

// how far back/forward "today" the manager can review/plan — generous
// enough to cover the dashboard's own Last 30 days view plus some forward
// planning, without being an unbounded fetch
const WINDOW_DAYS_BACK = 30;
const WINDOW_DAYS_FORWARD = 60;

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// Lets a manager set a specific RM's trial target for a specific calendar
// date — targets genuinely vary day to day per RM (e.g. 10 today, 12
// tomorrow, 34 the day after), so a single flat Daily Target can't
// represent that. Any day left unset here falls back to the standing Daily
// Target field above. See analytics.RmDailyTargetsView / get_rm_daily_targets_sum.
export const RmDailyTargetOverridesDialog: React.FC<RmDailyTargetOverridesDialogProps> = ({
  tenantMembershipId,
  rmName,
  open,
  onClose,
}) => {
  const [overrides, setOverrides] = useState<RmDailyTargetOverrideDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [newDate, setNewDate] = useState(isoDate(0));
  const [newTarget, setNewTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!tenantMembershipId) return;
    setLoading(true);
    setError(null);
    rmActivityApi
      .getDailyTargetOverrides(tenantMembershipId, isoDate(-WINDOW_DAYS_BACK), isoDate(WINDOW_DAYS_FORWARD))
      .then((rows) => setOverrides([...rows].sort((a, b) => (a.date < b.date ? -1 : 1))))
      .catch(() => setError('Failed to load targets'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) load();
    // only re-load when the dialog opens or the RM changes, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tenantMembershipId]);

  const handleSave = async () => {
    if (!tenantMembershipId || !newDate || newTarget === '') return;
    const targetNum = Number(newTarget);
    if (!Number.isInteger(targetNum) || targetNum < 0) {
      setError('Target must be a whole number, 0 or more');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await rmActivityApi.setDailyTargetOverride(tenantMembershipId, newDate, targetNum);
      setNewTarget('');
      load();
    } catch {
      setError('Failed to save target');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (date: string) => {
    if (!tenantMembershipId) return;
    setSaving(true);
    setError(null);
    try {
      await rmActivityApi.deleteDailyTargetOverride(tenantMembershipId, date);
      load();
    } catch {
      setError('Failed to remove target');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Daily Targets · {rmName}</DialogTitle>
          <DialogDescription>
            Set this RM's target for a specific date. Any day without one here uses the standing Daily Target instead.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-gray-500">Date</label>
            <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-9" />
          </div>
          <div className="w-24 space-y-1">
            <label className="text-xs font-medium text-gray-500">Target</label>
            <Input
              type="number"
              min="0"
              step="1"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              className="h-9"
              placeholder="12"
            />
          </div>
          <Button onClick={handleSave} disabled={saving || !newDate || newTarget === ''} className="h-9">
            Set
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="max-h-64 overflow-y-auto rounded-md border">
          {loading ? (
            <p className="p-3 text-sm text-gray-400">Loading…</p>
          ) : overrides.length === 0 ? (
            <p className="p-3 text-sm text-gray-400">
              No day-specific targets set — using the standing Daily Target every day.
            </p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {overrides.map((row) => (
                  <tr key={row.date} className="border-b last:border-b-0">
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2 font-medium">{row.target}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(row.date)}
                        disabled={saving}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
