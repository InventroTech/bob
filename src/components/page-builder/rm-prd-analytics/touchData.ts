// Powers the drill-down table opened by clicking a stat card. Every row here
// is a real CALL_TOUCH row fetched from the backend — we just filter down to
// the ones the clicked card is about and format them for display.

import type { UpdatedStatus, RmActivityEvent } from './types';
import { BREACH_SECONDS } from './aggregate';

export type DispositionKey = 'notConnected' | 'callBack' | 'notInterested' | 'trial';
export type DrillFilter = DispositionKey | 'breach' | 'all';

export { BREACH_SECONDS };

const DISPOSITION_TO_KEY: Record<UpdatedStatus, DispositionKey> = {
  NOT_CONNECTED: 'notConnected',
  CALL_BACK: 'callBack',
  NOT_INTERESTED: 'notInterested',
  TRIAL_ACTIVATED: 'trial',
};

export const DISPOSITIONS: Record<DispositionKey, { label: string; full: string }> = {
  notConnected: { label: 'Not connected', full: 'NOT_CONNECTED' },
  callBack: { label: 'Call back', full: 'CALL_BACK' },
  notInterested: { label: 'Not interested', full: 'NOT_INTERESTED' },
  trial: { label: 'Trial subscribed', full: 'TRIAL_ACTIVATED' },
};

export const DRILL_TITLES: Record<DrillFilter, string> = {
  all: 'Touch report',
  breach: 'Calls over 25 minutes',
  notConnected: 'Not connected · touch report',
  callBack: 'Call back · touch report',
  notInterested: 'Not interested · touch report',
  trial: 'Trial subscribed · touch report',
};

export interface TouchRow {
  touchId: number;
  leadId: number | null;
  rmName: string;
  manager: string;
  state: string;
  party: string;
  bucket: string;
  dispositionKey: DispositionKey;
  start: string;
  end: string;
  /** raw start instant, epoch ms — sort key; `start` is a formatted clock
   * string (HH:mm:ss) and isn't chronological across multiple days */
  startedAtMs: number;
  durationSeconds: number;
  durationLabel: string;
}

// The backend stores timestamps in UTC; this business runs in IST, so we
// format explicitly in that timezone rather than the viewer's own (and
// include seconds — most calls are under a minute, so without seconds the
// start and end time look identical).
const formatClock = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(Math.round(seconds % 60)).padStart(2, '0')}s`;
};

function toTouchRow(event: RmActivityEvent): TouchRow | null {
  // skip anything that isn't a finished call (open calls have no end time yet)
  if (event.eventType !== 'CALL_TOUCH' || event.endedAt === null) return null;
  if (!event.updatedStatus) return null;

  const durationSeconds = event.durationSeconds ?? 0;
  return {
    touchId: event.id,
    leadId: event.leadRecordId,
    rmName: event.rmName,
    manager: event.managerName,
    state: event.state,
    party: event.party ?? '',
    bucket: event.leadBucket ?? '',
    dispositionKey: DISPOSITION_TO_KEY[event.updatedStatus],
    start: formatClock(event.startedAt),
    end: formatClock(event.endedAt),
    startedAtMs: new Date(event.startedAt).getTime(),
    durationSeconds,
    durationLabel: formatDuration(durationSeconds),
  };
}

export function generateTouches(events: RmActivityEvent[], filter: DrillFilter): TouchRow[] {
  const rows = events
    .map(toTouchRow)
    .filter((row): row is TouchRow => row !== null);

  const filtered =
    filter === 'breach'
      ? rows.filter((row) => row.durationSeconds >= BREACH_SECONDS)
      : filter === 'all'
        ? rows
        : rows.filter((row) => row.dispositionKey === filter);

  return filtered.sort((a, b) => a.startedAtMs - b.startedAtMs);
}
