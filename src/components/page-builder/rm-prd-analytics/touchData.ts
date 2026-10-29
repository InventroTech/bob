// Powers the drill-down table opened by clicking a stat card. Every row here
// is a real CALL_TOUCH row fetched from the backend — we just filter down to
// the ones the clicked card is about and format them for display.

import type { UpdatedStatus, RmActivityEvent } from './types';
import { BREACH_THRESHOLDS, isBreachedCall } from './aggregate';

export type DispositionKey = 'notConnected' | 'callBack' | 'notInterested' | 'trial';
export type DrillFilter = DispositionKey | 'breach' | 'all';

export { BREACH_THRESHOLDS };

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
  breach: 'SLA breaches',
  notConnected: 'Not connected · touch report',
  callBack: 'Call back · touch report',
  notInterested: 'Not interested · touch report',
  trial: 'Trial subscribed · touch report',
};

// short "Xm" label for a disposition's breach threshold — e.g. 180s -> "3m",
// 210s -> "3.5m" (one decimal only when the threshold isn't a whole minute,
// rather than rounding it away to "4m")
const formatMinutesLabel = (seconds: number) => {
  const minutes = seconds / 60;
  return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)}m`;
};

export interface TouchRow {
  touchId: number;
  prajaId: string | null;
  rmName: string;
  manager: string;
  state: string;
  party: string;
  group: string;
  /** the RM's picked reason — only ever set on Not Interested rows */
  reason: string;
  /** which page/carousel instance (e.g. "All Leads", "Pending Leads")
   * opened this lead — empty for rows written before this was tracked */
  openedFrom: string;
  dispositionKey: DispositionKey;
  start: string;
  end: string;
  /** raw start/end instants, epoch ms — sort keys; `start`/`end` are
   * formatted clock strings (HH:mm:ss) and aren't chronological across
   * multiple days */
  startedAtMs: number;
  endedAtMs: number;
  /** null when the server couldn't find a trustworthy measured session for
   * this touch (see record_lead_touch_event's docstring) — never a guessed
   * number. durationLabel shows "Unknown" for these rather than "0s". */
  durationSeconds: number | null;
  durationLabel: string;
  /** this row's own disposition-specific breach threshold — not the same
   * value for every row (see BREACH_THRESHOLDS) */
  breachThresholdSeconds: number;
  breachThresholdLabel: string;
  isBreach: boolean;
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

function toTouchRow(event: RmActivityEvent, stateNameById: Record<string, string>): TouchRow | null {
  // skip anything that isn't a finished call (open calls have no end time yet)
  if (event.eventType !== 'CALL_TOUCH' || event.endedAt === null) return null;
  if (!event.updatedStatus) return null;

  const durationSeconds = event.durationSeconds;
  const breachThresholdSeconds = BREACH_THRESHOLDS[event.updatedStatus];
  return {
    touchId: event.id,
    prajaId: event.prajaId,
    rmName: event.rmName,
    manager: event.managerName,
    // event.state is the RM's own raw Circle ID — resolve to a display
    // name, falling back to the raw ID for any value not in the lookup
    // (e.g. no state set, or an ID the catalog doesn't recognize)
    state: stateNameById[event.state] || event.state,
    party: event.party ?? '',
    group: event.leadGroup ?? '',
    reason: event.reason ?? '',
    openedFrom: event.openedFrom ?? '',
    dispositionKey: DISPOSITION_TO_KEY[event.updatedStatus],
    start: formatClock(event.startedAt),
    end: formatClock(event.endedAt),
    startedAtMs: new Date(event.startedAt).getTime(),
    endedAtMs: new Date(event.endedAt).getTime(),
    durationSeconds,
    durationLabel: durationSeconds !== null ? formatDuration(durationSeconds) : 'Unknown',
    breachThresholdSeconds,
    breachThresholdLabel: formatMinutesLabel(breachThresholdSeconds),
    isBreach: isBreachedCall(event),
  };
}

export function generateTouches(
  events: RmActivityEvent[],
  filter: DrillFilter,
  stateNameById: Record<string, string> = {}
): TouchRow[] {
  const rows = events
    .map((event) => toTouchRow(event, stateNameById))
    .filter((row): row is TouchRow => row !== null);

  const filtered =
    filter === 'breach'
      ? rows.filter((row) => row.isBreach)
      : filter === 'all'
        ? rows
        : rows.filter((row) => row.dispositionKey === filter);

  return filtered.sort((a, b) => a.startedAtMs - b.startedAtMs);
}
