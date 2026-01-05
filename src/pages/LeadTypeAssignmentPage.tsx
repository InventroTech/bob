import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Users, Settings, AlertCircle, Trash2, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  LeadTypeAssignment, 
  LeadTypeAssignmentRequest, 
  LeadType 
} from '@/types/userSettings';
import { leadTypeAssignmentApi, userSettingsApi } from '@/lib/userSettingsApi';

interface LeadTypeAssignmentPageProps {
  // Optional props for when used as a page component
  className?: string;
  showHeader?: boolean;
  config?: {
    leadTypesEndpoint?: string;
    rmsEndpoint?: string;
    assignmentsEndpoint?: string;
    title?: string;
  };
}

const LeadTypeAssignmentPage = ({ className = '', showHeader = true, config }: LeadTypeAssignmentPageProps) => {
  const { user } = useAuth();
  const { role, customRole } = useTenant();
  const [assignments, setAssignments] = useState<LeadTypeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedLeadTypes, setSelectedLeadTypes] = useState<Record<string, LeadType[]>>({});
  const [availableLeadTypes, setAvailableLeadTypes] = useState<string[]>([]);
  const [roleChecked, setRoleChecked] = useState(false);
  const [leadsCounts, setLeadsCounts] = useState<Record<string, number>>({});
  const [originalLeadsCounts, setOriginalLeadsCounts] = useState<Record<string, number>>({});
  const [dailyLimits, setDailyLimits] = useState<Record<string, number>>({});
  const [originalDailyLimits, setOriginalDailyLimits] = useState<Record<string, number>>({});
  const [userUidMap, setUserUidMap] = useState<Record<string, string>>({}); // Map user_id (int) to uid (UUID)

  // Check if user has GM permissions (GM custom role only)
  // Strictly check: must be exactly 'GM', not null, undefined, or any other value
  const isGM = customRole === 'GM' || customRole === 'gm' || customRole?.toUpperCase() === 'GM';
  
  // Track when role has been checked (after a short delay to allow useTenant to fetch)
  useEffect(() => {
    if (user) {
      // Give useTenant hook time to fetch role data
      const timer = setTimeout(() => {
        setRoleChecked(true);
      }, 500); // 500ms delay to allow role to be fetched
      
      return () => clearTimeout(timer);
    }
  }, [user, customRole]);
  
  // Debug logging
  console.log('LeadTypeAssignmentPage: User role info:', {
    user: user?.id,
    role,
    customRole,
    isGM,
    userEmail: user?.email
  });

  // Fetch available lead types and assignments
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch available lead types from records' affiliated_party field
        // If no endpoint is configured, getAvailableLeadTypes will use the default: /user-settings/lead-types/
        const leadTypesEndpoint = config?.leadTypesEndpoint;
        const leadTypes = await leadTypeAssignmentApi.getAvailableLeadTypes(leadTypesEndpoint);
        setAvailableLeadTypes(leadTypes);
        
        // Fetch lead type assignments
        // If no endpoint is configured, getAll will use the default: /accounts/users/assignees-by-role/?role=RM
        const rmsEndpoint = config?.rmsEndpoint;
        const data = await leadTypeAssignmentApi.getAll(rmsEndpoint);
        setAssignments(data);
        
        // Build user_id to uid mapping for user_settings table (which uses UUID)
        const uidMap: Record<string, string> = {};
        const { data: { session: sessionForUid } } = await supabase.auth.getSession();
        const tokenForUid = sessionForUid?.access_token;
        if (tokenForUid) {
          try {
            const baseUrl = import.meta.env.VITE_RENDER_API_URL;
            const usersEndpoint = rmsEndpoint || '/accounts/users/assignees-by-role/?role=RM';
            const usersUrl = usersEndpoint.startsWith('http') ? usersEndpoint : `${baseUrl}${usersEndpoint}`;
            const usersResponse = await fetch(usersUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenForUid}`,
                'X-Tenant-Slug': 'bibhab-thepyro-ai'
              }
            });
            if (usersResponse.ok) {
              const usersData = await usersResponse.json();
              const users = Array.isArray(usersData) ? usersData : (usersData.results || []);
              users.forEach((user: any) => {
                if (user.uid) {
                  uidMap[String(user.id)] = user.uid;
                }
              });
            }
          } catch (error) {
            console.error('Error fetching user UIDs:', error);
          }
        }
        setUserUidMap(uidMap);
        
        // Initialize selected lead types
        const initialSelections: Record<string, LeadType[]> = {};
        data.forEach(assignment => {
          initialSelections[assignment.user_id] = assignment.lead_types as LeadType[];
        });
        setSelectedLeadTypes(initialSelections);

        // Initialize daily target + daily limit from assignments payload (new endpoint fields)
        const initialTargets: Record<string, number> = {};
        const initialLimits: Record<string, number> = {};
        data.forEach((assignment) => {
          if (assignment.daily_target !== undefined && assignment.daily_target !== null) {
            initialTargets[assignment.user_id] = assignment.daily_target;
          }
          if (assignment.daily_limit !== undefined && assignment.daily_limit !== null) {
            initialLimits[assignment.user_id] = assignment.daily_limit;
          }
        });

        // Fetch leads count (daily target) for each user (fallback to user-settings if not present in new endpoint)
        // Fetch assigned_leads_count per user from LEAD_TYPE_ASSIGNMENT (one request per user)

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          const counts: Record<string, number> = {};
          await Promise.all(
            data.map(async (assignment) => {
              const userUid = uidMap[String(assignment.user_id)];
              if (!userUid) {
                counts[assignment.user_id] = 0;
                return;
              }
              try {

                // Prefer daily_target from assignments endpoint if present
                if (initialTargets[assignment.user_id] !== undefined) {
                  counts[assignment.user_id] = initialTargets[assignment.user_id];
                  return;
                }

                // Try to get saved daily target from LEAD_TYPE_ASSIGNMENT record
                // Lead types are in value column, daily target is in daily_target column
                let savedCount = 0;
                const userUid = uidMap[String(assignment.user_id)];
                if (userUid) {
                  try {
                    const savedSetting = await userSettingsApi.get(userUid, 'LEAD_TYPE_ASSIGNMENT');
                    console.log('[LeadTypeAssignment] Retrieved LEAD_TYPE_ASSIGNMENT record:', {
                      user_id: assignment.user_id,
                      uid: userUid,
                      daily_target: savedSetting.daily_target,
                      value: savedSetting.value
                    });
                    
                    // Get from the daily_target column
                    if (savedSetting.daily_target !== undefined && savedSetting.daily_target !== null) {
                      savedCount = savedSetting.daily_target;
                      console.log('[LeadTypeAssignment] Loaded saved daily target from daily_target column:', savedCount, 'for user:', assignment.user_id);
                    } else {
                      // Column is null/undefined - backend might not be saving it
                      savedCount = 0;
                      console.warn('[LeadTypeAssignment] daily_target is null/undefined in LEAD_TYPE_ASSIGNMENT for user:', assignment.user_id, '- Backend may not be saving this field');
                    }
                  } catch (error: any) {
                    // If LEAD_TYPE_ASSIGNMENT record not found (404), fetch from API
                    if (error.message?.includes('404') || error.message?.includes('Not found')) {
                      console.log('[LeadTypeAssignment] No LEAD_TYPE_ASSIGNMENT record found, fetching from API for user:', assignment.user_id);
                      savedCount = await fetchUserLeadsCount(assignment.user_id, token);
                    } else {
                      console.error('[LeadTypeAssignment] Error loading leads count:', error);
                      savedCount = await fetchUserLeadsCount(assignment.user_id, token);
                    }
                  }
                } else {
                  console.log('[LeadTypeAssignment] No UID found for user:', assignment.user_id, 'fetching from API');
                  savedCount = await fetchUserLeadsCount(assignment.user_id, token);
                }

                counts[assignment.user_id] = savedCount;
              } catch (error) {
                console.error('[LeadTypeAssignment] Error fetching daily_target for user:', assignment.user_id, error);
                counts[assignment.user_id] = 0;
              }
            })
          );
          setLeadsCounts(counts);
          setOriginalLeadsCounts({ ...counts }); // Store original values for change detection
        }

        // Initialize daily limits state (default to 0 if not present)
        setDailyLimits((prev) => {
          const merged: Record<string, number> = { ...prev };
          data.forEach((assignment) => {
            merged[assignment.user_id] =
              initialLimits[assignment.user_id] ?? merged[assignment.user_id] ?? 0;
          });
          return merged;
        });
        setOriginalDailyLimits((prev) => {
          const merged: Record<string, number> = { ...prev };
          data.forEach((assignment) => {
            merged[assignment.user_id] =
              initialLimits[assignment.user_id] ?? merged[assignment.user_id] ?? 0;
          });
          return merged;
        });
        
        // Show message if no users found
        if (data.length === 0) {
          toast.info('No users found. The list is empty.');
        }
      } catch (error: any) {
        console.error('Error fetching lead type data:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          response: error.response
        });
        
        // If it's a 403 error, show a more helpful message
        if (error.message?.includes('Access denied') || error.message?.includes('GM role required')) {
          toast.error('Access denied: You need GM role to access lead type assignments');
        } else {
          toast.error(`Failed to fetch lead type data: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if user is authenticated AND has GM role
    if (user && isGM) {
      fetchData();
    } else if (user && !isGM) {
      // User is authenticated but not a GM, stop loading immediately
      setLoading(false);
    }
    // If no user, keep loading state until user is available
  }, [user, isGM]);

  // Handle lead type selection for a user
  const handleLeadTypeToggle = async (userId: string, leadType: LeadType, e?: React.MouseEvent) => {
    // Stop event propagation to prevent opening config sidebar
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    setSelectedLeadTypes(prev => {
      const currentTypes = prev[userId] || [];
      const newTypes = currentTypes.includes(leadType)
        ? currentTypes.filter(type => type !== leadType)
        : [...currentTypes, leadType];
      
      return {
        ...prev,
        [userId]: newTypes
      };
    });
  };

  // Handle leads count change
  const handleLeadsCountChange = (userId: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) {
      return;
    }

    setLeadsCounts(prev => ({
      ...prev,
      [userId]: numValue
    }));
  };

  // Handle daily limit change
  const handleDailyLimitChange = (userId: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) {
      return;
    }

    setDailyLimits(prev => ({
      ...prev,
      [userId]: numValue
    }));
  };

  // Save lead type assignment for a user
  const handleSaveAssignment = async (userId: string) => {
    try {
      setSaving(userId);
      const leadTypes = selectedLeadTypes[userId] || [];
      const assignedLeadsCount = leadsCounts[userId] ?? 0;
      const assignedDailyLimit = dailyLimits[userId] ?? 0;
      
      const request: LeadTypeAssignmentRequest = {
        user_id: userId,
        lead_types: leadTypes,
        daily_target: assignedLeadsCount, // Include daily target in the request
        daily_limit: assignedDailyLimit // Include daily limit in the request

      };

      const assignmentsEndpoint = config?.assignmentsEndpoint;
      await leadTypeAssignmentApi.assign(request, assignmentsEndpoint);
      
      // Save the daily target to the same LEAD_TYPE_ASSIGNMENT record
      // Lead types are in value column, daily_target goes in daily_target column
      const userUid = userUidMap[String(userId)];
      if (userUid) {
        try {
          console.log('[LeadTypeAssignment] Saving daily target to LEAD_TYPE_ASSIGNMENT record:', {
            user_id: userUid,
            key: 'LEAD_TYPE_ASSIGNMENT',
            daily_target: assignedLeadsCount
          });
          
          // Wait a bit for the LEAD_TYPE_ASSIGNMENT record to be created/updated by the API
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Get the current record to preserve the value field
          let currentValue = leadTypes;
          try {
            const currentSetting = await userSettingsApi.get(userUid, 'LEAD_TYPE_ASSIGNMENT');
            currentValue = currentSetting.value || leadTypes;
            console.log('[LeadTypeAssignment] Retrieved current LEAD_TYPE_ASSIGNMENT value:', currentValue);
          } catch (e: any) {
            // If record doesn't exist yet, use leadTypes
            console.log('[LeadTypeAssignment] LEAD_TYPE_ASSIGNMENT record not found yet, using leadTypes:', leadTypes);
            currentValue = leadTypes;
          }
          
          // Update the LEAD_TYPE_ASSIGNMENT record with both value and daily_target
          // Try PATCH first (partial update), then PUT if needed
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const baseUrl = import.meta.env.VITE_RENDER_API_URL;
            
            const updatePayload = {
              value: currentValue, // Preserve the lead types in value column
            daily_target: assignedLeadsCount, // Store daily target in daily_target column
            daily_limit: assignedDailyLimit // Store daily limit in daily_limit column (if supported)
            };
            console.log('[LeadTypeAssignment] Updating LEAD_TYPE_ASSIGNMENT with payload:', JSON.stringify(updatePayload, null, 2));
            
            const updateUrl = `${baseUrl}/user-settings/settings/${userUid}/LEAD_TYPE_ASSIGNMENT/`;
            
            // Try PATCH first (partial update)
            let updateResponse = await fetch(updateUrl, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
                'X-Tenant-Slug': 'bibhab-thepyro-ai'
              },
              body: JSON.stringify(updatePayload)
            });
            
            // If PATCH doesn't work, try PUT
            if (!updateResponse.ok) {
              console.log('[LeadTypeAssignment] PATCH failed, trying PUT. Status:', updateResponse.status);
              updateResponse = await fetch(updateUrl, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': token ? `Bearer ${token}` : '',
                  'X-Tenant-Slug': 'bibhab-thepyro-ai'
                },
                body: JSON.stringify(updatePayload)
              });
            }
            
            if (!updateResponse.ok) {
              const errorText = await updateResponse.text().catch(() => 'Unknown error');
              console.error('[LeadTypeAssignment] Update failed:', {
                status: updateResponse.status,
                statusText: updateResponse.statusText,
                error: errorText,
                payload: updatePayload,
                url: updateUrl
              });
              
              // Try to parse error as JSON
              let errorData;
              try {
                errorData = JSON.parse(errorText);
                console.error('[LeadTypeAssignment] Error details:', errorData);
              } catch (e) {
                // Not JSON, use as text
              }
              
              throw new Error(`Failed to update: ${updateResponse.status} - ${errorText}`);
            }
            
            const result = await updateResponse.json();
            console.log('[LeadTypeAssignment] Successfully updated LEAD_TYPE_ASSIGNMENT:', result);
            console.log('[LeadTypeAssignment] Response includes assigned_leads_count:', result.assigned_leads_count);
            
            // Verify the update worked
            if (result.assigned_leads_count === undefined || result.assigned_leads_count === null) {
              console.warn('[LeadTypeAssignment] WARNING: assigned_leads_count not in response! Backend may not be saving it.');
              toast.warning('Lead types saved, but assigned_leads_count may not be saved. Check backend API.');
            }
          } catch (updateError: any) {
            console.error('[LeadTypeAssignment] Error updating LEAD_TYPE_ASSIGNMENT:', updateError);
            console.error('[LeadTypeAssignment] Full error:', {
              message: updateError.message,
              stack: updateError.stack,
              userUid,
              assignedLeadsCount,
              currentValue
            });
            toast.error(`Failed to save leads count: ${updateError.message || 'Unknown error'}. Check console for details.`);
          }
        } catch (error: any) {
          console.error('[LeadTypeAssignment] Error saving leads count:', error);
          toast.warning(`Lead types saved, but failed to save leads count: ${error.message || 'Unknown error'}`);
        }
      } else {
        console.warn('[LeadTypeAssignment] No UID found for user:', userId);
        toast.warning('Lead types saved, but could not save leads count (user UID not found)');
      }
      
      // Update local state
      setAssignments(prev => 
        prev.map(assignment => 
          assignment.user_id === userId 
            ? { ...assignment, lead_types: leadTypes, daily_target: assignedLeadsCount, daily_limit: assignedDailyLimit }
            : assignment
        )
      );

      // Update original leads count to reflect saved value
      setOriginalLeadsCounts(prev => ({
        ...prev,
        [userId]: assignedLeadsCount
      }));

      // Update original daily limit to reflect saved value
      setOriginalDailyLimits(prev => ({
        ...prev,
        [userId]: assignedDailyLimit
      }));

      toast.success('Lead type assignment saved successfully');
    } catch (error: any) {
      console.error('Error saving lead type assignment:', error);
      // If it's a 403 error, show a more helpful message
      if (error.message?.includes('Access denied') || error.message?.includes('GM role required')) {
        toast.error('Access denied: You need GM role to assign lead types');
      } else {
        toast.error(`Failed to save lead type assignment: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setSaving(null);
    }
  };

  // Remove all lead type assignments for a user
  const handleRemoveAllAssignments = async (userId: string) => {
    try {
      setSaving(userId);
      
      const request: LeadTypeAssignmentRequest = {
        user_id: userId,
        lead_types: [] // Empty array to remove all assignments
      };

      const assignmentsEndpoint = config?.assignmentsEndpoint;
      await leadTypeAssignmentApi.assign(request, assignmentsEndpoint);
      
      // Update local state
      setAssignments(prev => 
        prev.map(assignment => 
          assignment.user_id === userId 
            ? { ...assignment, lead_types: [] }
            : assignment
        )
      );

      // Clear selected lead types for this user
      setSelectedLeadTypes(prev => ({
        ...prev,
        [userId]: []
      }));

      toast.success('All lead type assignments removed successfully');
    } catch (error: any) {
      console.error('Error removing lead type assignments:', error);
      // If it's a 403 error, show a more helpful message
      if (error.message?.includes('Access denied') || error.message?.includes('GM role required')) {
        toast.error('Access denied: You need GM role to remove lead type assignments');
      } else {
        toast.error(`Failed to remove lead type assignments: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setSaving(null);
    }
  };


  // Check if assignment has changes
  const hasChanges = (userId: string) => {
    const currentAssignment = assignments.find(a => a.user_id === userId);
    const selectedTypes = selectedLeadTypes[userId] || [];
    const originalTypes = currentAssignment?.lead_types || [];
    
    const leadTypesChanged = JSON.stringify(selectedTypes.sort()) !== JSON.stringify(originalTypes.sort());
    
    const currentLeadsCount = leadsCounts[userId] ?? 0;
    const originalLeadsCount = originalLeadsCounts[userId] ?? 0;
    const leadsCountChanged = currentLeadsCount !== originalLeadsCount;

    const currentDailyLimit = dailyLimits[userId] ?? 0;
    const originalDailyLimit = originalDailyLimits[userId] ?? 0;
    const dailyLimitChanged = currentDailyLimit !== originalDailyLimit;
    
    return leadTypesChanged || leadsCountChanged || dailyLimitChanged;
  };

  // Early access check - block non-GM users immediately
  // Once role is checked and user is not GM, show access denied
  // Also block if we have a non-GM role explicitly set
  if (user && roleChecked && !isGM) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
                    <p className="text-muted-foreground text-center">
                      You need GM (General Manager) role to access this page.
                    </p>
                    <div className="mt-4 p-3 bg-muted rounded text-sm">
                      <p><strong>Current Role:</strong> {role || 'None'}</p>
                      <p><strong>Custom Role:</strong> {customRole || 'None'}</p>
                      <p><strong>User ID:</strong> {user?.id}</p>
                      <p><strong>Is GM Check:</strong> {String(isGM)}</p>
                    </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Also block if customRole is set to something other than GM (even before roleChecked)
  if (user && customRole !== null && customRole !== 'GM' && customRole?.toUpperCase() !== 'GM') {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
                    <p className="text-muted-foreground text-center">
                      You need GM (General Manager) role to access this page.
                    </p>
                    <div className="mt-4 p-3 bg-muted rounded text-sm">
                      <p><strong>Current Role:</strong> {role || 'None'}</p>
                      <p><strong>Custom Role:</strong> {customRole || 'None'}</p>
                      <p><strong>User ID:</strong> {user?.id}</p>
                    </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading if user is not authenticated, or if we're still checking the role
  if (loading || !user || (!roleChecked && !customRole)) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading lead type assignments...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lead Type Assignment</h1>
            <p className="text-muted-foreground">
              Assign lead types to Relationship Managers (RMs)
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">GM Settings</span>
          </div>
        </div>
      )}


      {/* Lead Type Assignments */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">RM Lead Type Assignments</h2>
        
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No RMs Found</h3>
              <p className="text-muted-foreground text-center">
                No Relationship Managers found in your tenant. 
                Please add RMs first before assigning lead types.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">RM Name & Email</TableHead>
                    <TableHead className="w-[300px]">Lead Types</TableHead>
                    <TableHead className="w-[250px]">Currently Assigned</TableHead>
                    <TableHead className="w-[150px]">Daily Target</TableHead>
                    <TableHead className="w-[150px]">Daily Limit</TableHead>
                    <TableHead className="w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow 
                      key={assignment.user_id}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TableCell 
                        className="font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div>
                          <div className="font-semibold">{assignment.user_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {assignment.user_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {/* Lead Type Dropdown */}
                        {availableLeadTypes.length > 0 ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-between text-left font-normal"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="truncate">
                                  {(selectedLeadTypes[assignment.user_id] || []).length > 0
                                    ? `${(selectedLeadTypes[assignment.user_id] || []).length} selected`
                                    : 'Select lead types...'}
                                </span>
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent 
                              className="w-[280px] p-0" 
                              align="start"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="max-h-[300px] overflow-y-auto p-2">
                                {availableLeadTypes.length === 0 ? (
                                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                                    No lead types available
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {availableLeadTypes.map((leadType) => {
                                      const isSelected = (selectedLeadTypes[assignment.user_id] || []).includes(leadType);
                                      return (
                                        <div 
                                          key={leadType} 
                                          className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleLeadTypeToggle(assignment.user_id, leadType, e);
                                          }}
                                        >
                                          <Checkbox
                                            id={`${assignment.user_id}-${leadType}`}
                                            checked={isSelected}
                                            onCheckedChange={(checked) => {
                                              handleLeadTypeToggle(assignment.user_id, leadType);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                          <Label 
                                            htmlFor={`${assignment.user_id}-${leadType}`}
                                            className="text-sm font-normal cursor-pointer flex-1"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleLeadTypeToggle(assignment.user_id, leadType, e);
                                            }}
                                          >
                                            {leadType.replace(/_/g, ' ')}
                                          </Label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <div className="text-xs text-muted-foreground p-2">
                            No lead types available
                          </div>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {/* Currently Assigned Badges */}
                        <div className="flex flex-wrap gap-1">
                          {assignment.lead_types.length > 0 ? (
                            assignment.lead_types.map((leadType) => (
                              <Badge key={leadType} variant="secondary" className="text-xs">
                                {leadType.replace(/_/g, ' ')}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Input
                          type="number"
                          min="0"
                          value={leadsCounts[assignment.user_id] ?? 0}
                          onChange={(e) => handleLeadsCountChange(assignment.user_id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Input
                          type="number"
                          min="0"
                          value={dailyLimits[assignment.user_id] ?? 0}
                          onChange={(e) => handleDailyLimitChange(assignment.user_id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <div 
                          className="flex flex-col space-y-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveAssignment(assignment.user_id);
                            }}
                            disabled={!hasChanges(assignment.user_id) || saving === assignment.user_id}
                            size="sm"
                            className="w-full"
                          >
                            {saving === assignment.user_id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Saving...
                              </>
                            ) : (
                              'Save Changes'
                            )}
                          </Button>
                          
                          {/* Remove All Button */}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAllAssignments(assignment.user_id);
                            }}
                            disabled={assignment.lead_types.length === 0 || saving === assignment.user_id}
                            variant="outline"
                            size="sm"
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove All
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LeadTypeAssignmentPage;
