// Mirrors one row of the `rm_activity_events` table. This is the only shape
// the RM PRD analytics feature works with — the hook that fetches from the
// backend maps into this, and every aggregate/report function reads from it.

export type EventType = 'CALL_TOUCH' | 'LOGIN' | 'LOGOUT' | 'BREAK_START' | 'BREAK_END';
export type UpdatedStatus = 'NOT_CONNECTED' | 'CALL_BACK' | 'NOT_INTERESTED' | 'TRIAL_ACTIVATED';

export interface RmActivityEvent {
  id: number;
  rmUserId: string;
  rmName: string;
  managerName: string;
  team: string;
  state: string;
  eventType: EventType;
  // the fields below only apply to CALL_TOUCH rows — null everywhere else
  leadRecordId: number | null;
  updatedStatus: UpdatedStatus | null;
  leadBucket: string | null;
  party: string | null;
  // only ever set for a "Not Interested" disposition (the RM's picked
  // reason); null for the other 3 dispositions
  reason: string | null;
  startedAt: string; // ISO timestamp
  endedAt: string | null; // null = still ongoing right now
  durationSeconds: number | null;
}
