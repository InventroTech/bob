'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { userSettingsApi } from '@/lib/userSettingsApi';

interface LeadProgressBarProps {
  config?: {
    apiEndpoint?: string;
    statusDataApiEndpoint?: string;
    title?: string;
    targetCount?: number;
    segmentCount?: number;
    refreshInterval?: number;
  };
}

interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  closed: number;
  trialActivated?: number;
}

export const LeadProgressBar: React.FC<LeadProgressBarProps> = ({ config }) => {
  const { session } = useAuth();
  
  // Get today's date string (YYYY-MM-DD) for daily reset tracking
  const getTodayDateString = (): string => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  // Check if we need to reset (new day after midnight)
  const shouldResetCount = (): boolean => {
    try {
      const lastResetDate = localStorage.getItem('leadProgressBar_lastResetDate');
      const today = getTodayDateString();
      return lastResetDate !== today;
    } catch {
      return true;
    }
  };

  // Reset trial count when day changes
  const resetTrialCount = () => {
    try {
      const today = getTodayDateString();
      localStorage.setItem('leadProgressBar_trialActivated', '0');
      localStorage.setItem('leadProgressBar_lastResetDate', today);
    } catch (e) {
      console.warn('[LeadProgressBar] Failed to reset trial count:', e);
    }
  };

  // Load persisted trial activated count from localStorage
  const getPersistedTrialCount = (): number => {
    try {
      // Check if we need to reset (new day)
      if (shouldResetCount()) {
        resetTrialCount();
        return 0;
      }
      const stored = localStorage.getItem('leadProgressBar_trialActivated');
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  };


  const [leadStats, setLeadStats] = useState<LeadStats>({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    closed: 0,
    trialActivated: getPersistedTrialCount(),
  });
  const [assignedLeadsCount, setAssignedLeadsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate trial activations and remaining
  const trialActivated = leadStats.trialActivated || 0;
  // Use fetched assigned leads count or fallback to config or default
  const targetCount = assignedLeadsCount !== null ? assignedLeadsCount : (config?.targetCount ?? 10);
  
  // Automatically calculate segment count to match the number of assigned leads
  // Use targetCount as segmentCount (one segment per lead)
  // Only use config override if explicitly set
  const segmentCount = config?.segmentCount || targetCount;
  
  const remainingTrials = Math.max(0, targetCount - trialActivated);
  const progress = Math.min((trialActivated / targetCount) * 100, 100);
  const filledSegments = Math.min(
    Math.ceil((trialActivated / targetCount) * segmentCount),
    segmentCount
  );

  // Debug logging
  useEffect(() => {
    console.log('[LeadProgressBar] Current state:', {
      assignedLeadsCount,
      configTargetCount: config?.targetCount,
      targetCount,
      trialActivated,
      remainingTrials
    });
  }, [assignedLeadsCount, config?.targetCount, targetCount, trialActivated, remainingTrials]);

  // Fetch assigned leads count from LEAD_TYPE_ASSIGNMENT record
  const fetchAssignedLeadsCount = useCallback(async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        console.log('[LeadProgressBar] No session, skipping assigned leads fetch');
        return;
      }

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        console.log('[LeadProgressBar] No user, skipping assigned leads fetch');
        return;
      }

      console.log('[LeadProgressBar] Fetching assigned leads count for user:', currentUser.id);

      // Get the assigned leads count from LEAD_TYPE_ASSIGNMENT record
      // Lead types are in value column, count is in assigned_leads_count column
      try {
        const savedSetting = await userSettingsApi.get(currentUser.id, 'LEAD_TYPE_ASSIGNMENT');
        console.log('[LeadProgressBar] Retrieved LEAD_TYPE_ASSIGNMENT record:', {
          assigned_leads_count: savedSetting.assigned_leads_count,
          value: savedSetting.value
        });
        
        // Get from the assigned_leads_count column
        if (savedSetting.assigned_leads_count !== undefined && savedSetting.assigned_leads_count !== null) {
          const savedCount = savedSetting.assigned_leads_count;
          console.log('[LeadProgressBar] Found assigned leads count in LEAD_TYPE_ASSIGNMENT:', savedCount);
          setAssignedLeadsCount(savedCount);
          return;
        } else {
          console.log('[LeadProgressBar] assigned_leads_count is null/undefined, setting to 0');
          setAssignedLeadsCount(0);
          return;
        }
      } catch (error: any) {
        // If LEAD_TYPE_ASSIGNMENT record not found (404), set to 0
        if (error.message?.includes('404') || error.message?.includes('Not found')) {
          console.log('[LeadProgressBar] No LEAD_TYPE_ASSIGNMENT record found, setting count to 0');
          setAssignedLeadsCount(0);
        } else {
          console.error('[LeadProgressBar] Error loading assigned leads count:', error);
          setAssignedLeadsCount(0);
        }
      }
    } catch (error) {
      console.error('[LeadProgressBar] Error fetching assigned leads count:', error);
      setAssignedLeadsCount(0);
    }
  }, []);


  const fetchLeadStats = useCallback(async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        setLoading(false);
        return;
      }

      // Fetch assigned leads count first
      await fetchAssignedLeadsCount();

      // Only try API if explicitly configured, otherwise rely on event tracking
      if (!config?.apiEndpoint && !config?.statusDataApiEndpoint) {
        setLoading(false);
        return;
      }

      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      if (!baseUrl) {
        setLoading(false);
        return;
      }

      let trialActivatedCount = 0;
      let apiSuccess = false;

      // Try the configured endpoint if provided
      if (config?.statusDataApiEndpoint || config?.apiEndpoint) {
        try {
          const statusEndpoint = config?.statusDataApiEndpoint || "/get-lead-status";
          const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
          const endpoint = statusEndpoint.startsWith('/') ? statusEndpoint : `/${statusEndpoint}`;
          const apiUrl = config?.apiEndpoint 
            ? (config.apiEndpoint.startsWith('http') ? config.apiEndpoint : `${cleanBaseUrl}${config.apiEndpoint.startsWith('/') ? config.apiEndpoint : `/${config.apiEndpoint}`}`)
            : `${cleanBaseUrl}${endpoint}`;
          
          const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${currentSession.access_token}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const data = await response.json();
            trialActivatedCount = data.leadStats?.trialActivated || 
                                 data.leadStats?.trialsActivated || 
                                 data.leadStats?.trial_activated ||
                                 data.trialActivated ||
                                 data.trialsActivated ||
                                 0;
            apiSuccess = true;
          }
        } catch (endpointError) {
          // Silently fail - we'll rely on event tracking
        }
      }

      // Update with API count if available, otherwise keep current persisted count
      if (apiSuccess) {
        // Check if we need to reset (new day)
        if (shouldResetCount()) {
          resetTrialCount();
          setLeadStats(prev => ({
            ...prev,
            trialActivated: 0,
          }));
        } else {
          // Use API count if it's available (even if 0, to sync with server)
          const finalCount = trialActivatedCount >= 0 ? trialActivatedCount : (leadStats.trialActivated || 0);
          setLeadStats(prev => ({
            ...prev,
            trialActivated: finalCount,
          }));
          // Persist to localStorage
          try {
            const today = getTodayDateString();
            localStorage.setItem('leadProgressBar_trialActivated', finalCount.toString());
            localStorage.setItem('leadProgressBar_lastResetDate', today);
          } catch (e) {
            console.warn('[LeadProgressBar] Failed to persist trial count:', e);
          }
        }
      }
    } catch (error) {
      // Silently handle errors - component works via event tracking
    } finally {
      setLoading(false);
    }
  }, [config?.apiEndpoint, config?.statusDataApiEndpoint, fetchAssignedLeadsCount]);

  useEffect(() => {
    if (session) {
      setLoading(true);
      // Always fetch assigned leads count first
      fetchAssignedLeadsCount().finally(() => {
        // After fetching assigned leads count, continue with other fetches
        // Only fetch from API if endpoint is configured, otherwise rely on event tracking
        if (config?.apiEndpoint || config?.statusDataApiEndpoint) {
          fetchLeadStats();
        } else {
          // No API configured, just set loading to false and rely on events
          setLoading(false);
        }
      });
    }
  }, [session, config?.apiEndpoint, config?.statusDataApiEndpoint, fetchLeadStats, fetchAssignedLeadsCount]);

  // Set up polling to refresh stats periodically (only if API endpoint is configured)
  useEffect(() => {
    if (!session || (!config?.apiEndpoint && !config?.statusDataApiEndpoint)) return;

    const refreshInterval = config?.refreshInterval || 30000; // Default 30 seconds (less frequent)
    const intervalId = setInterval(() => {
      fetchLeadStats();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [session, config?.refreshInterval, config?.apiEndpoint, config?.statusDataApiEndpoint, fetchLeadStats]);

  // Check for midnight reset periodically
  useEffect(() => {
    const checkMidnightReset = () => {
      if (shouldResetCount()) {
        resetTrialCount();
        setLeadStats(prev => ({
          ...prev,
          trialActivated: 0,
        }));
      }
    };

    // Check immediately
    checkMidnightReset();

    // Check every minute for midnight crossing
    const intervalId = setInterval(checkMidnightReset, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, []);

  // Listen for trial activation events via custom events
  useEffect(() => {
    const handleTrialActivated = (event: CustomEvent) => {
      const leadId = event.detail?.leadId;
      
      // Check if we need to reset (new day)
      if (shouldResetCount()) {
        resetTrialCount();
        setLeadStats(prev => ({
          ...prev,
          trialActivated: 0,
        }));
      }

      // Increment local count immediately
      setLeadStats(prev => {
        const newCount = (prev.trialActivated || 0) + 1;
        // Persist to localStorage
        try {
          const today = getTodayDateString();
          localStorage.setItem('leadProgressBar_trialActivated', newCount.toString());
          localStorage.setItem('leadProgressBar_lastResetDate', today);
        } catch (e) {
          console.warn('[LeadProgressBar] Failed to persist trial count:', e);
        }
        return {
          ...prev,
          trialActivated: newCount,
        };
      });
      // Optionally fetch fresh stats from API if configured (but don't wait for it)
      if (config?.apiEndpoint || config?.statusDataApiEndpoint) {
        setTimeout(() => fetchLeadStats(), 1000);
      }
    };

    window.addEventListener('trial-activated', handleTrialActivated as EventListener);
    return () => {
      window.removeEventListener('trial-activated', handleTrialActivated as EventListener);
    };
  }, [config?.apiEndpoint, config?.statusDataApiEndpoint, fetchLeadStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading lead progress...</div>
      </div>
    );
  }

  return (
    <Card className="p-4 bg-white border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between gap-6">
        {/* Left Section: Title and Description */}
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-bold text-gray-900">
            {config?.title || "Target Progress"}
          </h2>
          <p className="text-base text-gray-600 font-normal">
            {remainingTrials} trial subscriptions remaining for today.
          </p>
        </div>

        {/* Right Section: Progress Count Bubble and Progress Bar */}
        <div className="flex flex-col gap-2 items-end">
          {/* Progress Count Bubble */}
          <div className="bg-gray-200 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium text-gray-900">
              {trialActivated}/{targetCount} Trail subscriptions
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-48 h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-800 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

