import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { teamAnalyticsApi } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';

export function useTeamOverview(date: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.teamAnalytics.overview(date),
    queryFn: () => teamAnalyticsApi.getTeamOverview(date),
    enabled: enabled && Boolean(date),
    placeholderData: keepPreviousData,
  });
}

export function useTeamMembers(date: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.teamAnalytics.members(date),
    queryFn: () => teamAnalyticsApi.getTeamMembers({ date }),
    enabled: enabled && Boolean(date),
    placeholderData: keepPreviousData,
  });
}

export function useTeamEvents(date: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.teamAnalytics.events(date),
    queryFn: () => teamAnalyticsApi.getTeamEvents({ date }),
    enabled: enabled && Boolean(date),
    placeholderData: keepPreviousData,
  });
}

export function useUnassignedLeadsBreakdown(
  params: { lead_source?: string; lead_stage?: string } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.teamAnalytics.unassigned(params),
    queryFn: () => teamAnalyticsApi.getUnassignedLeadsBreakdown(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useTeamTimeSeries(
  from: string,
  to: string,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.teamAnalytics.timeSeries(from, to),
    queryFn: () => teamAnalyticsApi.getTeamTimeSeries(from, to),
    enabled: enabled && Boolean(from) && Boolean(to),
  });
}
