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
  
  const [leadStats, setLeadStats] = useState<LeadStats>({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    closed: 0,
    trialActivated: 0,
  });
  const [dailyTarget, setDailyTarget] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate trial activations and remaining
  const trialActivated = leadStats.trialActivated || 0;
  // Use fetched daily target or fallback to config or default
  const targetCount = dailyTarget !== null ? dailyTarget : (config?.targetCount ?? 10);
  
  // Automatically calculate segment count to match the daily target
  // Use targetCount as segmentCount (one segment per target)
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
      dailyTarget,
      configTargetCount: config?.targetCount,
      targetCount,
      trialActivated,
      remainingTrials
    });
  }, [dailyTarget, config?.targetCount, targetCount, trialActivated, remainingTrials]);

  // Fetch daily target from LEAD_TYPE_ASSIGNMENT record
  const fetchDailyTarget = useCallback(async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        console.log('[LeadProgressBar] No session, skipping daily target fetch');
        return;
      }

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        console.log('[LeadProgressBar] No user, skipping daily target fetch');
        return;
      }

      console.log('[LeadProgressBar] Fetching daily target for user:', currentUser.id);

      // Get the daily target from LEAD_TYPE_ASSIGNMENT record
      // Lead types are in value column, daily target is in daily_target column
      try {
        const savedSetting = await userSettingsApi.get(currentUser.id, 'LEAD_TYPE_ASSIGNMENT');
        console.log('[LeadProgressBar] Retrieved LEAD_TYPE_ASSIGNMENT record:', {
          daily_target: savedSetting.daily_target,
          value: savedSetting.value
        });
        
        // Get from the daily_target column
        if (savedSetting.daily_target !== undefined && savedSetting.daily_target !== null) {
          const savedTarget = savedSetting.daily_target;
          console.log('[LeadProgressBar] Found daily target in LEAD_TYPE_ASSIGNMENT:', savedTarget);
          setDailyTarget(savedTarget);
          return;
        } else {
          console.log('[LeadProgressBar] daily_target is null/undefined, setting to 0');
          setDailyTarget(0);
          return;
        }
      } catch (error: any) {
        // If LEAD_TYPE_ASSIGNMENT record not found (404), set to 0
        if (error.message?.includes('404') || error.message?.includes('Not found')) {
          console.log('[LeadProgressBar] No LEAD_TYPE_ASSIGNMENT record found, setting daily target to 0');
          setDailyTarget(0);
        } else {
          console.error('[LeadProgressBar] Error loading daily target:', error);
          setDailyTarget(0);
        }
      }
    } catch (error) {
      console.error('[LeadProgressBar] Error fetching daily target:', error);
      setDailyTarget(0);
    }
  }, []);


  const fetchTrialStats = useCallback(async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        setLoading(false);
        return;
      }

      const baseUrl = import.meta.env.VITE_RENDER_API_URL?.replace(/\/+$/, '');
      if (!baseUrl) {
        setLoading(false);
        return;
      }

      const url = `${baseUrl}/crm-records/trials/activations/today/`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        setLoading(false);
        return;
      }

      const data = await response.json();
      const apiCount = typeof data.count === "number" ? data.count : 0;
      setLeadStats(prev => ({
        ...prev,
        trialActivated: apiCount,
      }));

      if (data.daily_target !== undefined && data.daily_target !== null) {
        setDailyTarget(data.daily_target);
      }
    } catch (error) {
      // Silent fail; UI will just keep current state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      setLoading(true);
      // Always fetch daily target first
      fetchDailyTarget().finally(() => {
        fetchTrialStats();
      });
    }
  }, [session, fetchTrialStats, fetchDailyTarget]);

  // Listen for trial activation events - only query DB when trial is activated
  useEffect(() => {
    const handleTrialActivated = async (event: CustomEvent) => {
      const providedCount = typeof event.detail?.trialActivatedCount === 'number'
        ? event.detail.trialActivatedCount
        : null;

      // Fetch fresh stats from API immediately when trial is activated
      // This is the only time we query the database (no periodic polling)
      await fetchTrialStats();
    };

    window.addEventListener('trial-activated', handleTrialActivated as EventListener);
    return () => {
      window.removeEventListener('trial-activated', handleTrialActivated as EventListener);
    };
  }, [fetchTrialStats]);

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

