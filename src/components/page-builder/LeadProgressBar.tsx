'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { leadTypeAssignmentApi } from '@/lib/userSettingsApi';

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
  
  // Load persisted trial activated count from localStorage
  const getPersistedTrialCount = (): number => {
    try {
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

  // Fetch assigned leads count based on RM's assigned lead types
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

      const baseUrl = (import.meta.env.VITE_RENDER_API_URL || '').replace(/\/+$/, '');
      if (!baseUrl) {
        console.log('[LeadProgressBar] No base URL configured');
        return;
      }

      console.log('[LeadProgressBar] Fetching lead types for user:', currentUser.id);

      // Step 1: Get the lead types assigned to this RM
      const userLeadTypes = await leadTypeAssignmentApi.getUserLeadTypes(currentUser.id);
      const assignedLeadTypes = userLeadTypes.lead_types || [];

      console.log('[LeadProgressBar] Assigned lead types:', assignedLeadTypes);

      if (assignedLeadTypes.length === 0) {
        console.warn('[LeadProgressBar] No lead types assigned to user, setting count to 0');
        setAssignedLeadsCount(0);
        return;
      }

      // Step 2: Query leads that match these lead types (stored in poster field)
      const params = new URLSearchParams();
      params.append('entity_type', 'lead');
      
      // Normalize lead types to match database format (spaces -> underscores, lowercase)
      const normalizedLeadTypes = assignedLeadTypes.map(lt => 
        lt.toLowerCase().replace(/\s+/g, '_')
      );
      
      // Add poster filter - try comma-separated format first
      // If that doesn't work, the API might accept multiple params
      params.append('poster', normalizedLeadTypes.join(','));
      
      params.append('page_size', '1'); // Just need count, not data
      
      const leadsUrl = `${baseUrl}/crm-records/records/?${params.toString()}`;
      
      console.log('[LeadProgressBar] Fetching leads for lead types:', leadsUrl);
      
      const response = await fetch(leadsUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
          "Content-Type": "application/json",
          "X-Tenant-Slug": "bibhab-thepyro-ai",
        },
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('[LeadProgressBar] Leads API response:', responseData);
        
        // Get total count from API response
        const totalCount = responseData.page_meta?.total_count || responseData.count || 0;
        
        if (totalCount > 0) {
          console.log('[LeadProgressBar] Setting assigned leads count to:', totalCount, 'for lead types:', assignedLeadTypes);
          setAssignedLeadsCount(totalCount);
        } else {
          console.warn('[LeadProgressBar] No leads found for assigned lead types');
          setAssignedLeadsCount(0);
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.warn('[LeadProgressBar] Failed to fetch leads count:', response.status, errorText);
        // Try fallback: fetch all leads and filter by poster field
        // Normalize lead types for fallback too
        const normalizedLeadTypes = assignedLeadTypes.map(lt => 
          lt.toLowerCase().replace(/\s+/g, '_')
        );
        await fetchAssignedLeadsCountFallback(normalizedLeadTypes, baseUrl, currentSession.access_token, setAssignedLeadsCount);
      }
    } catch (error) {
      console.error('[LeadProgressBar] Error fetching assigned leads count:', error);
      // Will use config or default
    }
  }, []);

  // Fallback: Fetch leads and filter by poster field if API filtering doesn't work
  const fetchAssignedLeadsCountFallback = async (
    normalizedLeadTypes: string[], 
    baseUrl: string, 
    token: string,
    setCount: (count: number) => void
  ) => {
    try {
      const params = new URLSearchParams();
      params.append('entity_type', 'lead');
      params.append('page_size', '1000'); // Fetch a large batch
      
      const leadsUrl = `${baseUrl}/crm-records/records/?${params.toString()}`;
      
      const response = await fetch(leadsUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Tenant-Slug": "bibhab-thepyro-ai",
        },
      });

      if (response.ok) {
        const responseData = await response.json();
        const results = responseData.data || responseData.results || [];
        
        // Filter leads where poster field matches assigned lead types
        // Normalize poster value for comparison (spaces -> underscores, lowercase)
        const assignedCount = results.filter((lead: any) => {
          const poster = lead.data?.poster || lead.poster;
          if (!poster) return false;
          const normalizedPoster = String(poster).toLowerCase().replace(/\s+/g, '_');
          return normalizedLeadTypes.includes(normalizedPoster);
        }).length;
        
        const totalCount = responseData.page_meta?.total_count || responseData.count || results.length;
        
        // If we got all results, use actual count, otherwise estimate
        let finalCount = assignedCount;
        if (results.length === 1000 && totalCount > 1000) {
          finalCount = Math.ceil((assignedCount / 1000) * totalCount);
        }
        
        if (finalCount > 0) {
          console.log('[LeadProgressBar] Fallback: Setting assigned leads count to:', finalCount);
          setCount(finalCount);
        }
      }
    } catch (error) {
      console.error('[LeadProgressBar] Fallback fetch error:', error);
    }
  };

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
        // Use API count if it's available (even if 0, to sync with server)
        const finalCount = trialActivatedCount >= 0 ? trialActivatedCount : (leadStats.trialActivated || 0);
        setLeadStats(prev => ({
          ...prev,
          trialActivated: finalCount,
        }));
        // Persist to localStorage
        try {
          localStorage.setItem('leadProgressBar_trialActivated', finalCount.toString());
        } catch (e) {
          console.warn('[LeadProgressBar] Failed to persist trial count:', e);
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

  // Listen for trial activation events via custom events
  useEffect(() => {
    const handleTrialActivated = () => {
      // Increment local count immediately
      setLeadStats(prev => {
        const newCount = (prev.trialActivated || 0) + 1;
        // Persist to localStorage
        try {
          localStorage.setItem('leadProgressBar_trialActivated', newCount.toString());
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

    window.addEventListener('trial-activated', handleTrialActivated);
    return () => {
      window.removeEventListener('trial-activated', handleTrialActivated);
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
    <Card className="p-3 bg-white border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        {/* Left side: Title and Progress Bar */}
        <div className="flex flex-col gap-2 flex-1">
          <h2 className="text-sm font-semibold text-gray-700">
            {config?.title || "Target Progress"}
          </h2>
          {/* Progress Bar - Slimmer */}
          <div className="flex gap-0.5">
            {Array.from({ length: segmentCount }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "flex-1 h-4 rounded-full transition-all duration-300",
                  index < filledSegments
                    ? "bg-green-500"
                    : "bg-gray-200"
                )}
              />
            ))}
          </div>
        </div>

        {/* Right side: Badge with remaining count */}
        <div className="flex flex-col items-end gap-0.5">
          <div className="bg-gray-200 rounded-md px-3 py-1.5">
            <span className="text-xs font-medium text-gray-800">
              {remainingTrials} trial subscriptions
            </span>
          </div>
          <span className="text-xs text-gray-500">are remaining</span>
        </div>
      </div>
    </Card>
  );
};

