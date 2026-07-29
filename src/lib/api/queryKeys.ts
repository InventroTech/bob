/**
 * Central React Query key factory.
 * Keep keys hierarchical and serializable so invalidation stays predictable.
 */
export const queryKeys = {
  jobs: {
    types: (kind: string) => ['jobs', kind, 'types'] as const,
    detail: (kind: string, id: string) => ['jobs', kind, id] as const,
  },
  entityTypes: {
    all: ['entity-types'] as const,
  },
  teamAnalytics: {
    overview: (date: string) =>
      ['team-analytics', 'overview', date] as const,
    members: (date: string) =>
      ['team-analytics', 'members', date] as const,
    events: (date: string) =>
      ['team-analytics', 'events', date] as const,
    unassigned: (params: {
      lead_source?: string;
      lead_stage?: string;
    }) => ['team-analytics', 'unassigned', params] as const,
    timeSeries: (from: string, to: string) =>
      ['team-analytics', 'time-series', from, to] as const,
  },
  billing: {
    report: (params: { month: string; cycleDays?: number }) =>
      ['billing', 'report', params] as const,
  },
  membership: {
    users: ['membership', 'users'] as const,
    roles: ['membership', 'roles'] as const,
    hierarchy: ['membership', 'hierarchy'] as const,
  },
  crmRecords: {
    list: (params: {
      entity_type: string;
      page_size?: number;
      page?: number;
      search?: string;
      [k: string]: string | number | boolean | undefined;
    }) => ['crm-records', 'list', params] as const,
  },
};
