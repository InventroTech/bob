import { supabase } from '@/lib/supabase';

const BASE_URL = import.meta.env.VITE_RENDER_API_URL?.replace(/\/+$/, '') || import.meta.env.VITE_API_URI?.replace(/\/+$/, '');

/**
 * Team Analytics API Client
 * Handles all team metrics API calls
 */
export const teamAnalyticsApi = {
  /**
   * Get team overview metrics for a specific date
   */
  async getTeamOverview(date: string): Promise<{
    attendance: number;
    total_team_size: number;
    calls_made: number;
    trials_activated: number;
    connected_to_trial_ratio: number | null;
    average_time_spent_seconds: number | null;
    trail_target: number;
    allotted_leads: number;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Authentication required');
      }

      if (!BASE_URL) {
        throw new Error('API base URL not configured');
      }

      const url = `${BASE_URL}/analytics/team/overview/?date=${date}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[teamAnalyticsApi] Error fetching team overview:', error);
      throw error;
    }
  },

  /**
   * Get per-member metrics breakdown
   */
  async getTeamMembers(params: { date?: string; from?: string; to?: string }): Promise<Array<{
    user_id: string;
    email: string;
    daily_target: number;
    attendance: number;
    total_events: number;
    calls_made: number;
    calls_connected: number;
    trials_activated: number;
    connected_to_trial_ratio: number | null;
    get_next_lead_count: number;
    take_break_count: number;
    not_interested_count: number;
    average_time_spent_seconds: number;
  }>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Authentication required');
      }

      if (!BASE_URL) {
        throw new Error('API base URL not configured');
      }

      const searchParams = new URLSearchParams();
      if (params.date) searchParams.append('date', params.date);
      if (params.from) searchParams.append('from', params.from);
      if (params.to) searchParams.append('to', params.to);

      const url = `${BASE_URL}/analytics/team/members/?${searchParams.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[teamAnalyticsApi] Error fetching team members:', error);
      throw error;
    }
  },

  /**
   * Get event type breakdown
   */
  async getTeamEvents(params: { date?: string; from?: string; to?: string }): Promise<Array<{
    event_type: string;
    count: number;
  }>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Authentication required');
      }

      if (!BASE_URL) {
        throw new Error('API base URL not configured');
      }

      const searchParams = new URLSearchParams();
      if (params.date) searchParams.append('date', params.date);
      if (params.from) searchParams.append('from', params.from);
      if (params.to) searchParams.append('to', params.to);

      const url = `${BASE_URL}/analytics/team/events/?${searchParams.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[teamAnalyticsApi] Error fetching team events:', error);
      throw error;
    }
  },

  /**
   * Get time series data over a date range
   */
  async getTeamTimeSeries(from: string, to: string): Promise<Array<{
    date: string;
    attendance: number;
    calls_made: number;
    trials_activated: number;
    total_events: number;
  }>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Authentication required');
      }

      if (!BASE_URL) {
        throw new Error('API base URL not configured');
      }

      const url = `${BASE_URL}/analytics/team/time-series/?from=${from}&to=${to}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[teamAnalyticsApi] Error fetching team time series:', error);
      throw error;
    }
  },
};
