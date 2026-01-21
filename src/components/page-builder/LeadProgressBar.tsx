'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { userSettingsApi } from '@/lib/userSettingsApi';
import { crmLeadsApi } from '@/lib/crmLeadsApi';
import { TrophyIcon } from '@/components/icons/CustomIcons';

interface LeadProgressBarProps {
  config?: {
    apiEndpoint?: string;
    statusDataApiEndpoint?: string;
    title?: string;
    targetCount?: number;
    segmentCount?: number;
    refreshInterval?: number;
    progressBarColor?: string;
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

  // Determine the state: below, achieved, or overdone
  const isAchieved = trialActivated >= targetCount;
  const isOverdone = trialActivated > targetCount;
  const isBelow = trialActivated < targetCount;
  
  // Calculate progress for display (can exceed 100% for overdone case)
  const displayProgress = (trialActivated / targetCount) * 100;
  
  // Get progress bar color - use green for all states, config color override for below if provided
  const progressBarColor = isAchieved 
    ? '#16a34a' // Dark green for achieved/overdone
    : (config?.progressBarColor !== undefined && config?.progressBarColor !== null && config?.progressBarColor !== '') 
      ? config.progressBarColor 
      : '#16a34a'; // Default to green for below limit


  // Fetch daily target from LEAD_TYPE_ASSIGNMENT record
  const fetchDailyTarget = useCallback(async () => {
    try {
      if (!session) {
        return;
      }

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        return;
      }

      // Get the daily target from LEAD_TYPE_ASSIGNMENT record
      // Lead types are in value column, daily target is in daily_target column
      try {
        const savedSetting = await userSettingsApi.get(currentUser.id, 'LEAD_TYPE_ASSIGNMENT');
        
        // Get from the daily_target column
        if (savedSetting.daily_target !== undefined && savedSetting.daily_target !== null) {
          const savedTarget = savedSetting.daily_target;
          setDailyTarget(savedTarget);
          return;
        } else {
          setDailyTarget(0);
          return;
        }
      } catch (error: any) {
        // If LEAD_TYPE_ASSIGNMENT record not found (404), set to 0
        if (error.message?.includes('404') || error.message?.includes('Not found')) {
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


  const fetchTrialStats = useCallback(async (isInitialLoad = false) => {
    try {
      if (!session) {
        if (isInitialLoad) {
          setLoading(false);
        }
        return;
      }

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        if (isInitialLoad) {
          setLoading(false);
        }
        return;
      }

      // Get today's date range in ISO format for backend filtering
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dateFrom = today.toISOString();
      const dateTo = tomorrow.toISOString();

      // Use backend filtering - much more efficient!
      const trialActivatedCount = await crmLeadsApi.getTrialActivationCount(
        currentUser.id,
        dateFrom,
        dateTo
      );

      setLeadStats(prev => ({
        ...prev,
        trialActivated: trialActivatedCount,
      }));
    } catch (error) {
      console.error('[LeadProgressBar] Error fetching trial stats:', error);
      setLeadStats(prev => ({
        ...prev,
        trialActivated: 0,
      }));
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (session) {
      setLoading(true);
      // Always fetch daily target first, then fetch trial stats on initial load
      // This runs every time component mounts (refresh or navigation back)
      // Don't reset trialActivated to 0 - let fetchTrialStats update it
      fetchDailyTarget().finally(() => {
        fetchTrialStats(true); // Fetch trial stats on initial load
      });
    }
  }, [session, fetchDailyTarget, fetchTrialStats]);

  // Listen for trial activation events - only query DB when trial is activated
  useEffect(() => {
    const handleTrialActivated = async (event: CustomEvent) => {
      // Optimistic update: increment count immediately for better UX
      const optimisticCount = (leadStats.trialActivated || 0) + 1;
      setLeadStats(prev => ({
        ...prev,
        trialActivated: optimisticCount,
      }));
      
      // Fetch stats from API after a delay to ensure backend has processed the event
      // Retry logic: try multiple times if count hasn't increased yet
      const fetchWithRetry = async (retries = 3, delay = 2000) => {
        for (let i = 0; i < retries; i++) {
          await new Promise(resolve => setTimeout(resolve, delay));
          
          try {
            if (!session) return;
            
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) return;
            
            // Get today's date range in ISO format for backend filtering
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const dateFrom = today.toISOString();
            const dateTo = tomorrow.toISOString();

            // Use backend filtering - much more efficient!
            const fetchedCount = await crmLeadsApi.getTrialActivationCount(
              currentUser.id,
              dateFrom,
              dateTo
            );
            
            // Only update if fetched count is >= optimistic count (don't decrease)
            if (fetchedCount >= optimisticCount) {
              setLeadStats(prev => ({
                ...prev,
                trialActivated: fetchedCount,
              }));
              return; // Success, stop retrying
            }
            // If fetched count is less, continue retrying
          } catch (error) {
            console.error(`[LeadProgressBar] Retry ${i + 1}/${retries} error:`, error);
          }
        }
        
        // If all retries failed, keep the optimistic count (don't decrease)
        console.warn('[LeadProgressBar] Could not confirm trial activation after retries, keeping optimistic count');
      };
      
      fetchWithRetry();
    };

    window.addEventListener('trial-activated', handleTrialActivated as EventListener);
    return () => {
      window.removeEventListener('trial-activated', handleTrialActivated as EventListener);
    };
  }, [leadStats.trialActivated]);

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
          <h5>
            {config?.title || "Target Progress"}
          </h5>
          {isBelow ? (
            <p className="text-body text-muted-foreground">
              {remainingTrials} trial subscriptions remaining for today.
            </p>
          ) : (
            <p className="text-body">
              Hurray! You achieved your target (<span className="text-body-bold">{targetCount}</span>). Trying for more will give you additional incentives.
            </p>
          )}
        </div>

        {/* Right Section: Progress Count Bubble and Progress Bar */}
        <div className="flex flex-col gap-2 items-end">
          {/* Progress Count Bubble */}
          {isBelow ? (
            <div className="w-48 bg-green-100 rounded-lg px-3 py-1.5">
              <span className="text-body-sm-medium text-green-800">
                {trialActivated}/{targetCount} Trial subscriptions
              </span>
            </div>
          ) : isAchieved && !isOverdone ? (
            <div className="w-48 bg-green-100 rounded-lg px-3 py-1.5">
              <span className="text-body-sm-medium text-green-800">
                {targetCount}/{targetCount} Target Achieved
              </span>
            </div>
          ) : (
            <div className="w-48 bg-green-100 rounded-lg px-3 py-1.5">
              <span className="text-body-sm-medium text-green-800">
                {trialActivated - targetCount} More Than Daily Target
              </span>
            </div>
          )}
          
          {/* Progress Bar */}
          <div className="w-48 relative overflow-visible py-2">
            <div className="h-2.5 bg-gray-200 rounded-full relative">
              {/* Progress fill - shows actual progress, capped at 100% visually */}
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{ 
                  width: `${Math.min(displayProgress, 100)}%`,
                  backgroundColor: progressBarColor
                }}
              />
              {/* Trophy icon - at 100% when just achieved, fixed under "e" when overdone */}
              {isAchieved && (
                <div
                  className="absolute top-1/2 z-20"
                  style={{
                    left: isOverdone ? '85%' : '100%', // Fixed under "e" for overflow, at end for just achieved
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <TrophyIcon className="h-6 w-6 drop-shadow-sm" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

