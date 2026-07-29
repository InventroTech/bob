/** Pure helpers for AddUserComponent. */

import { leadTypeAssignmentApi } from '@/lib/api/services/userSettings';
import type { Role } from './types';

/** CSE daily target is a resolve-rate goal expressed as a percentage. */
export function formatResolveRateGoal(value?: string | number): string {
  if (value === undefined || value === null || value === '—' || value === '') {
    return '—';
  }
  return `${value}%`;
}

export async function patchSupportDailyKv(
  membershipId: string | number,
  {
    resolveRateGoal,
    limitSelfTrial,
    limitOther,
  }: {
    resolveRateGoal?: string;
    limitSelfTrial?: string;
    limitOther?: string;
  }
): Promise<void> {
  const payload: Record<string, number | null> = {};
  if (resolveRateGoal !== undefined) {
    payload.support_resolve_rate_goal =
      resolveRateGoal !== '' ? Number(resolveRateGoal) : null;
  }
  if (limitSelfTrial !== undefined) {
    payload.support_daily_limit_self_trial =
      limitSelfTrial !== '' ? Number(limitSelfTrial) : null;
  }
  if (limitOther !== undefined) {
    payload.support_daily_limit_other =
      limitOther !== '' ? Number(limitOther) : null;
  }
  if (Object.keys(payload).length === 0) return;
  await leadTypeAssignmentApi.patchSupportDailyLimits(String(membershipId), payload);
}

export function isCseRole(role?: Role): boolean {
  const name = role?.name?.toUpperCase() ?? '';
  return name.includes('CSE') || name.includes('CUSTOMER SUPPORT');
}
