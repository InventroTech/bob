// Turns raw rm_activity_events rows (fetched from the backend) into the
// numbers the dashboard shows. Every card and table below is one of these
// functions run against the same array of events — nothing is hardcoded.

import type { UpdatedStatus, RmActivityEvent } from './types';

const ACHT_THRESHOLDS = {
  notConnected: 90, // 1m 30s
  callBack: 900, // 15m 00s
  notInterested: 1080, // 18m 00s
  trial: 1500, // 25m 00s
};
export const BREACH_SECONDS = ACHT_THRESHOLDS.trial;

// a "full" reference shift, used only to project a pace/occupancy bar
const STANDARD_SHIFT_MINUTES = 600; // 10 hours

// rm_user_id -> that RM's own DAILY_TARGET setting (see useRmDailyTargets).
// An RM absent from this map has no target configured, which reads as 0 —
// matching how the Team Dashboard's "Trial Target" already treats it.
export type DailyTargetsByRm = Record<string, number>;
const targetFor = (targetsByRm: DailyTargetsByRm, rmUserId: string) => targetsByRm[rmUserId] ?? 0;

// "—" when there's no target to compare against — an unset target must not
// silently read as achieved/0 (Infinity% or NaN%, depending on achieved)
export function formatVsTarget(achieved: number, target: number): string {
  return target ? `${((achieved / target) * 100).toFixed(1)}%` : '—';
}

const isCallTouch = (e: RmActivityEvent) => e.eventType === 'CALL_TOUCH';
const isClosedCallTouch = (e: RmActivityEvent) => isCallTouch(e) && e.endedAt !== null;

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`;
}

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return hours > 0 ? `${hours}h ${String(remainingMinutes).padStart(2, '0')}m` : `${remainingMinutes}m`;
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}

// groups events by RM, keeping each RM's own events in the order they happened
function groupByRm(events: RmActivityEvent[]): Map<string, RmActivityEvent[]> {
  const byRm = new Map<string, RmActivityEvent[]>();
  events.forEach((event) => {
    const list = byRm.get(event.rmUserId);
    if (list) list.push(event);
    else byRm.set(event.rmUserId, [event]);
  });
  return byRm;
}

// a lead's "current disposition" is whatever its most recent touch says —
// matches how the dashboard note explains attempts-per-lead vs. unique leads
function latestTouchPerLead(calls: RmActivityEvent[]): RmActivityEvent[] {
  const latestById = new Map<number, RmActivityEvent>();
  calls.forEach((call) => {
    if (call.leadRecordId == null) return;
    const current = latestById.get(call.leadRecordId);
    if (!current || call.startedAt > current.startedAt) latestById.set(call.leadRecordId, call);
  });
  return [...latestById.values()];
}

// distinct real leads only — a null leadRecordId (shouldn't normally happen,
// but isn't a lead) must not collapse into a single counted "unique lead",
// or the 4 disposition rates stop summing to 100%
function uniqueLeadCount(calls: RmActivityEvent[]): number {
  const ids = new Set(calls.map((c) => c.leadRecordId).filter((id): id is number => id != null));
  return ids.size;
}

function countByDisposition(calls: RmActivityEvent[]): Record<UpdatedStatus, number> {
  const counts: Record<UpdatedStatus, number> = {
    NOT_CONNECTED: 0,
    CALL_BACK: 0,
    NOT_INTERESTED: 0,
    TRIAL_ACTIVATED: 0,
  };
  calls.forEach((call) => {
    if (call.updatedStatus) counts[call.updatedStatus] += 1;
  });
  return counts;
}

// ---- shift timing (login / break / who's doing what right now) ----

interface ShiftTiming {
  loginMinutes: number;
  breakMinutes: number;
  status: 'On lead' | 'Off lead' | 'Idle';
  statusMinutes: number;
}

function computeShiftTiming(rmEvents: RmActivityEvent[]): ShiftTiming {
  const now = Date.now();

  // RMs are only ever actually recorded touching leads in production — LOGIN/LOGOUT
  // rows aren't created by any real flow, so anchoring to them left loginMinutes at
  // 0 for everyone. Instead, treat the shift span as the envelope of every recorded
  // activity: the first touch of the day to the most recent one, whether that's the
  // start of a lead or the end of one.
  const timestamps: number[] = [];
  rmEvents.forEach((e) => {
    timestamps.push(new Date(e.startedAt).getTime());
    if (e.endedAt) timestamps.push(new Date(e.endedAt).getTime());
  });
  const loginAtMs = timestamps.length ? Math.min(...timestamps) : now;
  const loggedOutAtMs = timestamps.length ? Math.max(...timestamps) : now;
  const loginMinutes = (loggedOutAtMs - loginAtMs) / 60_000;

  let breakMinutes = 0;
  let openBreakStartedAtMs: number | null = null;
  rmEvents
    .filter((e) => e.eventType === 'BREAK_START')
    .forEach((breakStart) => {
      const startMs = new Date(breakStart.startedAt).getTime();
      const matchingEnd = rmEvents.find(
        (e) => e.eventType === 'BREAK_END' && new Date(e.startedAt).getTime() > startMs
      );
      const endMs = matchingEnd ? new Date(matchingEnd.startedAt).getTime() : now;
      breakMinutes += (endMs - startMs) / 60_000;
      if (!matchingEnd) openBreakStartedAtMs = startMs;
    });

  const openCall = rmEvents.find((e) => isCallTouch(e) && e.endedAt === null);
  if (openCall) {
    return {
      loginMinutes,
      breakMinutes,
      status: 'On lead',
      statusMinutes: Math.round((now - new Date(openCall.startedAt).getTime()) / 60_000),
    };
  }
  if (openBreakStartedAtMs !== null) {
    return {
      loginMinutes,
      breakMinutes,
      status: 'Off lead',
      statusMinutes: Math.round((now - openBreakStartedAtMs) / 60_000),
    };
  }
  // no open call and no open break — not actively on a lead, but not on a
  // logged break either (was 'On lead', which falsely implied an active call)
  return { loginMinutes, breakMinutes, status: 'Idle', statusMinutes: 0 };
}

// ---- Performance tab ----

export interface RmPerformanceRow {
  rmUserId: string;
  name: string;
  manager: string;
  team: string;
  state: string;
  uniqueLeads: number;
  touches: number;
  attemptsPerLead: number;
  notConnectedRate: number;
  callBackRate: number;
  notInterestedRate: number;
  trialRate: number;
  achieved: number;
  target: number;
}

function buildPerformanceRow(
  rmUserId: string,
  rmEvents: RmActivityEvent[],
  targetsByRm: DailyTargetsByRm
): RmPerformanceRow {
  const first = rmEvents[0];
  // only finished calls have a settled outcome — a call still in progress
  // can't be classified into a disposition yet, so it doesn't count here
  const calls = rmEvents.filter(isClosedCallTouch);
  const uniqueLeads = uniqueLeadCount(calls);
  const touches = calls.length;
  const counts = countByDisposition(latestTouchPerLead(calls));
  const pct = (n: number) => (uniqueLeads ? Math.round((n / uniqueLeads) * 1000) / 10 : 0);

  return {
    rmUserId,
    name: first.rmName,
    manager: first.managerName,
    team: first.team,
    state: first.state,
    uniqueLeads,
    touches,
    attemptsPerLead: uniqueLeads ? Math.round((touches / uniqueLeads) * 100) / 100 : 0,
    notConnectedRate: pct(counts.NOT_CONNECTED),
    callBackRate: pct(counts.CALL_BACK),
    notInterestedRate: pct(counts.NOT_INTERESTED),
    trialRate: pct(counts.TRIAL_ACTIVATED),
    achieved: counts.TRIAL_ACTIVATED,
    target: targetFor(targetsByRm, rmUserId),
  };
}

export function computePerformanceByRm(
  events: RmActivityEvent[],
  targetsByRm: DailyTargetsByRm = {}
): RmPerformanceRow[] {
  return [...groupByRm(events)].map(([rmUserId, rmEvents]) => buildPerformanceRow(rmUserId, rmEvents, targetsByRm));
}

export function computeTeamTotals(events: RmActivityEvent[], targetsByRm: DailyTargetsByRm = {}) {
  // same rule as the per-RM rows: a call still in progress has no outcome yet
  const calls = events.filter(isClosedCallTouch);
  const uniqueLeads = uniqueLeadCount(calls);
  const touches = calls.length;
  const counts = countByDisposition(latestTouchPerLead(calls));
  const achieved = counts.TRIAL_ACTIVATED;
  // sum of each RM's own target, for whichever RMs were actually active
  // (have events) in this range — not a flat number × headcount
  const activeRmIds = [...groupByRm(events).keys()];
  const target = activeRmIds.reduce((sum, rmUserId) => sum + targetFor(targetsByRm, rmUserId), 0);
  const pct = (n: number) => (uniqueLeads ? Math.round((n / uniqueLeads) * 1000) / 10 : 0);

  return {
    uniqueLeadsHandled: uniqueLeads,
    touches,
    attemptsPerLead: uniqueLeads ? Math.round((touches / uniqueLeads) * 100) / 100 : 0,
    achieved,
    target,
    trialActivationRate: pct(achieved),
    notConnectedRate: { rate: pct(counts.NOT_CONNECTED), leads: counts.NOT_CONNECTED },
    callBackRate: { rate: pct(counts.CALL_BACK), leads: counts.CALL_BACK },
    notInterestedRate: { rate: pct(counts.NOT_INTERESTED), leads: counts.NOT_INTERESTED },
    trialSubscribedRate: { rate: pct(achieved), leads: achieved },
  };
}

// ---- Adherence tab ----

export interface RmAdherenceRow {
  rmUserId: string;
  name: string;
  manager: string;
  team: string;
  state: string;
  status: 'On lead' | 'Off lead' | 'Idle';
  statusMinutes: number;
  loginHours: string;
  handlingHours: string;
  breakTime: string;
  occupancy: number;
  touches: number;
  acht: string;
  notConnectedTime: number;
  notConnectedLabel: string;
  callBackTime: number;
  callBackLabel: string;
  notInterestedTime: number;
  notInterestedLabel: string;
  trialTime: number;
  trialLabel: string;
  breaches: number;
  open: number;
}

function buildAdherenceRow(rmUserId: string, rmEvents: RmActivityEvent[]): RmAdherenceRow {
  const first = rmEvents[0];
  const timing = computeShiftTiming(rmEvents);

  const calls = rmEvents.filter(isCallTouch);
  const closedCalls = calls.filter(isClosedCallTouch);
  const openCalls = calls.filter((c) => c.endedAt === null);

  const handlingSeconds = closedCalls.reduce((sum, c) => sum + (c.durationSeconds ?? 0), 0);
  const handlingMinutes = handlingSeconds / 60;
  const occupancy = timing.loginMinutes ? Math.round((handlingMinutes / timing.loginMinutes) * 100) : 0;

  const secondsFor = (updatedStatus: UpdatedStatus) =>
    closedCalls.filter((c) => c.updatedStatus === updatedStatus).map((c) => c.durationSeconds ?? 0);
  const notConnectedTime = Math.round(average(secondsFor('NOT_CONNECTED')));
  const callBackTime = Math.round(average(secondsFor('CALL_BACK')));
  const notInterestedTime = Math.round(average(secondsFor('NOT_INTERESTED')));
  const trialTime = Math.round(average(secondsFor('TRIAL_ACTIVATED')));

  return {
    rmUserId,
    name: first.rmName,
    manager: first.managerName,
    team: first.team,
    state: first.state,
    status: timing.status,
    statusMinutes: timing.statusMinutes,
    loginHours: formatHours(timing.loginMinutes),
    handlingHours: formatHours(handlingMinutes),
    breakTime: formatHours(timing.breakMinutes),
    occupancy,
    touches: closedCalls.length, // matches the Performance tab: "touches" means finished calls, "open" is separate
    acht: formatDuration(average(closedCalls.map((c) => c.durationSeconds ?? 0))),
    notConnectedTime,
    notConnectedLabel: formatDuration(notConnectedTime),
    callBackTime,
    callBackLabel: formatDuration(callBackTime),
    notInterestedTime,
    notInterestedLabel: formatDuration(notInterestedTime),
    trialTime,
    trialLabel: formatDuration(trialTime),
    // >= matches the touch report's own breach flag (and the PDF spec: "shown
    // if duration_seconds >= 1500") — a call landing at exactly 25:00 must
    // count as a breach in both places, not just one
    breaches: closedCalls.filter((c) => (c.durationSeconds ?? 0) >= BREACH_SECONDS).length,
    open: openCalls.length,
  };
}

export function computeAdherenceByRm(events: RmActivityEvent[]): RmAdherenceRow[] {
  return [...groupByRm(events)].map(([rmUserId, rmEvents]) => buildAdherenceRow(rmUserId, rmEvents));
}

export function computeShiftTimeAverages(events: RmActivityEvent[]) {
  const rows = computeAdherenceByRm(events);
  const n = rows.length || 1;

  const totalLoginMinutes = rows.reduce((sum, r) => sum + hoursLabelToMinutes(r.loginHours), 0);
  const totalHandlingMinutes = rows.reduce((sum, r) => sum + hoursLabelToMinutes(r.handlingHours), 0);
  const totalBreakMinutes = rows.reduce((sum, r) => sum + hoursLabelToMinutes(r.breakTime), 0);
  const avgLoginMinutes = totalLoginMinutes / n;
  const avgHandlingMinutes = totalHandlingMinutes / n;
  const avgBreakMinutes = totalBreakMinutes / n;

  const occupancyFraction = avgLoginMinutes ? avgHandlingMinutes / avgLoginMinutes : 0;
  const projectedFullShiftMinutes = occupancyFraction * STANDARD_SHIFT_MINUTES;

  return {
    loginHours: { value: formatHours(avgLoginMinutes), total: formatHours(totalLoginMinutes) },
    handlingTime: {
      value: formatHours(avgHandlingMinutes),
      pace: formatHours(projectedFullShiftMinutes),
      paceFraction: Math.min(avgHandlingMinutes / STANDARD_SHIFT_MINUTES, 1),
    },
    breakTime: {
      value: formatHours(avgBreakMinutes),
      offLeadPct: avgLoginMinutes ? Math.round((avgBreakMinutes / avgLoginMinutes) * 100) : 0,
    },
    occupancy: { value: Math.round(occupancyFraction * 100), sub: 'Handling ÷ login' },
    breaches: { value: rows.reduce((sum, r) => sum + r.breaches, 0), sub: 'Today' },
    openTouches: { value: rows.reduce((sum, r) => sum + r.open, 0), sub: 'Never closed' },
  };
}

// small helper so we can average the already-formatted "Xh Ym" strings
// without re-deriving them from raw events a second time
function hoursLabelToMinutes(label: string): number {
  const hoursMatch = label.match(/(\d+)h/);
  const minutesMatch = label.match(/(\d+)m/);
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
  return hours * 60 + minutes;
}

export function computeAchtOverall(events: RmActivityEvent[]) {
  const closedCalls = events.filter(isClosedCallTouch);
  const secondsFor = (updatedStatus: UpdatedStatus) =>
    closedCalls.filter((c) => c.updatedStatus === updatedStatus).map((c) => c.durationSeconds ?? 0);

  const build = (updatedStatus: UpdatedStatus, thresholdSeconds: number, thresholdLabel: string) => {
    const seconds = secondsFor(updatedStatus);
    const avgSeconds = average(seconds);
    return {
      value: formatDuration(avgSeconds),
      touches: seconds.length,
      threshold: thresholdLabel,
      fraction: Math.min(avgSeconds / (thresholdSeconds * 1.5), 1),
    };
  };

  return {
    value: formatDuration(average(closedCalls.map((c) => c.durationSeconds ?? 0))),
    touches: closedCalls.length,
    notConnected: build('NOT_CONNECTED', ACHT_THRESHOLDS.notConnected, '≤1m 30s'),
    callBack: build('CALL_BACK', ACHT_THRESHOLDS.callBack, '≤15m 00s'),
    notInterested: build('NOT_INTERESTED', ACHT_THRESHOLDS.notInterested, '≤18m 00s'),
    trial: build('TRIAL_ACTIVATED', ACHT_THRESHOLDS.trial, '≤25m 00s'),
  };
}

export const achtThresholds = ACHT_THRESHOLDS;

// ---- one RM's own shift snapshot (for the lead card carousel) ----

export interface MyShiftDispositionStat {
  value: string;
  touches: number;
  threshold: string;
  fraction: number;
}

export interface MyShiftSnapshot {
  handling: { value: string; pace: string; paceFraction: number };
  breakTime: { value: string; offLeadPct: number };
  notConnected: MyShiftDispositionStat;
  callBack: MyShiftDispositionStat;
  notInterested: MyShiftDispositionStat;
  trial: MyShiftDispositionStat;
}

// Same formulas as buildAdherenceRow/computeAchtOverall above, just scoped to
// one RM's events instead of everyone's — this is what the lead card
// carousel's "Your Shift" panel shows.
export function computeMyShiftSnapshot(events: RmActivityEvent[], rmUserId: string): MyShiftSnapshot {
  const rmEvents = events.filter((e) => e.rmUserId === rmUserId);
  const timing = computeShiftTiming(rmEvents);
  const closedCalls = rmEvents.filter(isClosedCallTouch);

  const handlingMinutes = closedCalls.reduce((sum, c) => sum + (c.durationSeconds ?? 0), 0) / 60;
  const occupancyFraction = timing.loginMinutes ? handlingMinutes / timing.loginMinutes : 0;

  const buildDispositionStat = (
    updatedStatus: UpdatedStatus,
    thresholdSeconds: number,
    thresholdLabel: string
  ): MyShiftDispositionStat => {
    const seconds = closedCalls.filter((c) => c.updatedStatus === updatedStatus).map((c) => c.durationSeconds ?? 0);
    const avgSeconds = average(seconds);
    return {
      value: formatDuration(avgSeconds),
      touches: seconds.length,
      threshold: thresholdLabel,
      fraction: Math.min(avgSeconds / (thresholdSeconds * 1.5), 1),
    };
  };

  return {
    handling: {
      value: formatHours(handlingMinutes),
      pace: formatHours(occupancyFraction * STANDARD_SHIFT_MINUTES),
      paceFraction: Math.min(handlingMinutes / STANDARD_SHIFT_MINUTES, 1),
    },
    breakTime: {
      value: formatHours(timing.breakMinutes),
      offLeadPct: timing.loginMinutes ? Math.round((timing.breakMinutes / timing.loginMinutes) * 100) : 0,
    },
    notConnected: buildDispositionStat('NOT_CONNECTED', ACHT_THRESHOLDS.notConnected, '≤1m 30s'),
    callBack: buildDispositionStat('CALL_BACK', ACHT_THRESHOLDS.callBack, '≤15m 00s'),
    notInterested: buildDispositionStat('NOT_INTERESTED', ACHT_THRESHOLDS.notInterested, '≤18m 00s'),
    trial: buildDispositionStat('TRIAL_ACTIVATED', ACHT_THRESHOLDS.trial, '≤25m 00s'),
  };
}
