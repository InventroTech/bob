import { createApiClient } from '@/lib/api/client';

const BASE_URL = import.meta.env.VITE_RENDER_API_URL?.replace(/\/+$/, '') || import.meta.env.VITE_API_URI?.replace(/\/+$/, '');

// Create API client for this service
const apiClient = createApiClient(BASE_URL || '');

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
      const response = await apiClient.get('/analytics/team/overview/', {
        params: { date }
      });

      return response.data;
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
      const response = await apiClient.get('/analytics/team/members/', {
        params
      });

      return response.data;
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
      const response = await apiClient.get('/analytics/team/events/', {
        params
      });

      return response.data;
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
      const response = await apiClient.get('/analytics/team/time-series/', {
        params: { from, to }
      });

      return response.data;
    } catch (error) {
      console.error('[teamAnalyticsApi] Error fetching team time series:', error);
      throw error;
    }
  },
};
