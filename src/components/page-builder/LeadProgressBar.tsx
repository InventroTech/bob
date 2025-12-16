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


  // Fetch daily target from LEAD_TYPE_ASSIGNMENT record
  const fetchDailyTarget = useCallback(async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
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
    let trialActivatedCount = 0;
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
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

      const baseUrl = import.meta.env.VITE_RENDER_API_URL?.replace(/\/+$/, '');
      if (!baseUrl) {
        if (isInitialLoad) {
          setLoading(false);
        }
        return;
      }

      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch event logs with query parameters to filter on backend
      // Filter by event name only - we'll filter by date and user locally
      // Request a large page size to get all events in one request if possible
      const params = new URLSearchParams({
        event: 'lead.trial_activated',
        page_size: '1000', // Request large page size to get all events
      });
      
      // Fetch all pages if paginated
      let allEvents: any[] = [];
      let nextUrl: string | null = `${baseUrl}/crm-records/events/?${params.toString()}`;
      let pageCount = 0;
      
      while (nextUrl) {
        pageCount++;
        
        const response = await fetch(nextUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${currentSession.access_token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.error('[LeadProgressBar] API error:', response.status, response.statusText);
          break;
        }

        const data = await response.json();
        
        // Handle different response formats (array or paginated)
        let events: any[] = [];
        if (Array.isArray(data)) {
          events = data;
          nextUrl = null; // No pagination if array
        } else if (data.results && Array.isArray(data.results)) {
          events = data.results;
          // Check for next page
          nextUrl = data.next || null;
        } else if (data.data && Array.isArray(data.data)) {
          events = data.data;
          nextUrl = data.next || null;
        } else {
          nextUrl = null;
        }
        
        allEvents = [...allEvents, ...events];
      }

      // Filter events for current user's trial activations and today's date
      // Backend filtered by event name, we filter by user and date locally
      const filteredEvents = allEvents.filter((event: any) => {
        // Check user (from payload or event data)
        const userUid = event.payload?.user_supabase_uid || event.user_supabase_uid || event.user_id;
        if (userUid !== currentUser.id) {
          return false;
        }
        
        // Filter by today's date using timestamp or created_at
        const eventDate = event.timestamp || event.created_at || event.payload?.timestamp;
        if (!eventDate) {
          return false; // Skip events without date
        }
        
        const eventDateStr = new Date(eventDate).toISOString().split('T')[0];
        return eventDateStr === todayStr;
      });
      
      trialActivatedCount = filteredEvents.length;
    } catch (error) {
      console.error('[LeadProgressBar] Error fetching trial stats:', error);
    } finally {
      // Always update state with the fetched count (even if 0 or error)
      setLeadStats(prev => ({
        ...prev,
        trialActivated: trialActivatedCount,
      }));
      
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
          
          // Fetch current count
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (!currentSession) return;
          
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) return;
          
          const baseUrl = import.meta.env.VITE_RENDER_API_URL?.replace(/\/+$/, '');
          if (!baseUrl) return;
          
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];
          const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          
          // Filter by event name only - we'll filter by date and user locally
          // Request a large page size to get all events in one request if possible
          const params = new URLSearchParams({
            event: 'lead.trial_activated',
            page_size: '1000', // Request large page size to get all events
          });
          
          try {
            // Fetch all pages if paginated
            let allEvents: any[] = [];
            let nextUrl: string | null = `${baseUrl}/crm-records/events/?${params.toString()}`;
            let pageCount = 0;
            
            while (nextUrl) {
              pageCount++;
              const response = await fetch(nextUrl, {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${currentSession.access_token}`,
                  "Content-Type": "application/json",
                },
              });
              
              if (!response.ok) {
                console.error(`[LeadProgressBar] Retry ${i + 1}/${retries} API error:`, response.status, response.statusText);
                break;
              }
              
              const data = await response.json();
              let events: any[] = [];
              if (Array.isArray(data)) {
                events = data;
                nextUrl = null;
              } else if (data.results && Array.isArray(data.results)) {
                events = data.results;
                nextUrl = data.next || null;
              } else if (data.data && Array.isArray(data.data)) {
                events = data.data;
                nextUrl = data.next || null;
              } else {
                nextUrl = null;
              }
              
              allEvents = [...allEvents, ...events];
            }
            
            const fetchedCount = allEvents.filter((event: any) => {
              // Check user (from payload or event data)
              const userUid = event.payload?.user_supabase_uid || event.user_supabase_uid || event.user_id;
              if (userUid !== currentUser.id) {
                return false;
              }
              
              // Filter by today's date using timestamp or created_at
              const eventDate = event.timestamp || event.created_at || event.payload?.timestamp;
              if (!eventDate) {
                return false; // Skip events without date
              }
              
              const eventDateStr = new Date(eventDate).toISOString().split('T')[0];
              return eventDateStr === todayStr;
            }).length;
            
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
            console.error('[LeadProgressBar] Error fetching trial stats in retry:', error);
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
  }, [fetchTrialStats, leadStats.trialActivated]);

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

