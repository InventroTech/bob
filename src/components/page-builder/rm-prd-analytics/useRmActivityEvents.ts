import { useEffect, useState } from 'react';
import { rmActivityApi, type RmActivityEventDto } from '@/lib/api/services/rmActivity';
import type { RmActivityEvent } from './types';
import type { DateBounds } from './dateRange';

// bounds are epoch ms and may straddle two UTC calendar days (e.g. "Today"
// in IST); widen to the UTC dates the instants fall in so the backend
// window is a superset — filterByDateRange does the precise trim afterward.
const toUtcDateParam = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// The backend's server clock runs in UTC and it sends timestamps like
// "2026-09-15T12:12:25.948229" — a real UTC instant, but with no "Z" or
// offset on it. Per spec, a date-time string with no timezone marker is
// parsed as the *browser's* local time, not UTC — so without this, anyone
// viewing from a non-UTC machine (e.g. IST) gets every timestamp silently
// misread. Stamping "Z" on here, once, keeps every date built from these
// fields downstream correct.
function asUtcIso(value: string): string {
  return value.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
}

// the backend stores everything but id/event_type inside a JSON event_data
// blob (same shape as crm_records.Record's entity_type + data) — this is the
// one place that unpacks a row into the flat shape the rest of this feature uses
function mapDto(dto: RmActivityEventDto): RmActivityEvent {
  const data = dto.event_data;
  return {
    id: dto.id,
    rmUserId: data.rm_user_id,
    rmName: data.rm_name,
    managerName: data.manager_name,
    team: data.team,
    state: data.state,
    eventType: dto.event_type,
    leadRecordId: data.lead_record_id,
    updatedStatus: data.updated_status,
    leadBucket: data.lead_bucket,
    party: data.party,
    startedAt: asUtcIso(data.started_at),
    endedAt: data.ended_at ? asUtcIso(data.ended_at) : null,
    durationSeconds: data.duration_seconds,
  };
}

// `bounds` windows the fetch to just that range instead of the whole tenant
// table — pass null only when there's genuinely nothing to show yet (e.g.
// "Custom" range picked but no dates chosen), which skips the fetch entirely
// rather than falling back to an unbounded one.
export function useRmActivityEvents(bounds: DateBounds | null) {
  const [events, setEvents] = useState<RmActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const from = bounds ? toUtcDateParam(bounds.from) : undefined;
  const to = bounds ? toUtcDateParam(bounds.to) : undefined;
  const hasWindow = bounds !== null;

  useEffect(() => {
    let cancelled = false;

    if (!hasWindow) {
      setEvents([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    rmActivityApi
      .getEvents({ from, to })
      .then((rows) => {
        if (!cancelled) setEvents(rows.map(mapDto));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load RM activity data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasWindow, from, to]);

  return { events, loading, error };
}
