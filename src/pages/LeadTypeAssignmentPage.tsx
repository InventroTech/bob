import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Users, Settings, AlertCircle, Trash2, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  LeadTypeAssignment, 
  LeadTypeAssignmentRequest, 
  LeadType 
} from '@/types/userSettings';
import { leadTypeAssignmentApi } from '@/lib/userSettingsApi';

interface LeadTypeAssignmentPageProps {
  // Optional props for when used as a page component
  className?: string;
  showHeader?: boolean;
  config?: {
    leadTypesEndpoint?: string;
    leadSourcesEndpoint?: string;
    rmsEndpoint?: string;
    assignmentsEndpoint?: string;
    title?: string;
  };
}

const LeadTypeAssignmentPage = ({ className = '', showHeader = true, config }: LeadTypeAssignmentPageProps) => {
  const { user } = useAuth();
  const { role, customRole, refetchCustomRole } = useTenant();
  const [assignments, setAssignments] = useState<LeadTypeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedLeadTypes, setSelectedLeadTypes] = useState<Record<string, LeadType[]>>({});
  const [selectedLeadSources, setSelectedLeadSources] = useState<Record<string, string[]>>({});
  const [selectedLeadStatuses, setSelectedLeadStatuses] = useState<Record<string, string[]>>({});
  const [availableLeadTypes, setAvailableLeadTypes] = useState<string[]>([]);
  const [availableLeadSources, setAvailableLeadSources] = useState<string[]>([]);
  const [availableLeadStatuses, setAvailableLeadStatuses] = useState<string[]>([]);
  const [roleChecked, setRoleChecked] = useState(false);
  const [leadsCounts, setLeadsCounts] = useState<Record<string, number | ''>>({});
  const [originalLeadsCounts, setOriginalLeadsCounts] = useState<Record<string, number>>({});
  const [dailyLimits, setDailyLimits] = useState<Record<string, number | ''>>({});
  const [originalDailyLimits, setOriginalDailyLimits] = useState<Record<string, number>>({});

  // Check if user has GM permissions (GM custom role only)
  // Strictly check: must be exactly 'GM', not null, undefined, or any other value
  const isGM = customRole === 'GM' || customRole === 'gm' || customRole?.toUpperCase() === 'GM';
  
  // Refetch role when visiting this page; retry once after delay so newly added GMs see the page without re-login
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    setRoleChecked(false);
    // First refetch immediately
    refetchCustomRole().then(() => {
      if (cancelled) return;
      // Show access decision after first refetch (existing GMs see page quickly)
      timeouts.push(setTimeout(() => setRoleChecked(true), 200));
      // Retry once after 1.5s so newly added GMs get role without re-login (updates customRole if backend now returns GM)
      const retryId = setTimeout(() => {
        if (cancelled) return;
        refetchCustomRole();
      }, 1500);
      timeouts.push(retryId);
    });
    return () => {
      cancelled = true;
      timeouts.forEach((id) => clearTimeout(id));
    };
  }, [user, refetchCustomRole]);
  
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
        const leadSourcesEndpoint = config?.leadSourcesEndpoint;
        const [leadTypes, leadSources, leadStatuses] = await Promise.all([
          leadTypeAssignmentApi.getAvailableLeadTypes(leadTypesEndpoint),
          leadTypeAssignmentApi.getAvailableLeadSources(leadSourcesEndpoint),
          leadTypeAssignmentApi.getAvailableLeadStatuses(),
        ]);
        setAvailableLeadTypes(leadTypes);
        setAvailableLeadSources(leadSources);
        setAvailableLeadStatuses(leadStatuses);

        // Fetch lead type assignments (now returns TenantMembership-based data)
        const rmsEndpoint = config?.rmsEndpoint;
        const data = await leadTypeAssignmentApi.getAll(rmsEndpoint);
        setAssignments(data);
        
        // Initialize selected lead types, lead sources, and lead statuses
        const initialSelections: Record<string, LeadType[]> = {};
        const initialLeadSources: Record<string, string[]> = {};
        const initialLeadStatuses: Record<string, string[]> = {};
        data.forEach(assignment => {
          initialSelections[assignment.user_id] = assignment.lead_types as LeadType[];
          initialLeadSources[assignment.user_id] = assignment.lead_sources ?? [];
          initialLeadStatuses[assignment.user_id] = assignment.lead_statuses ?? [];
        });
        setSelectedLeadTypes(initialSelections);
        setSelectedLeadSources(initialLeadSources);
        setSelectedLeadStatuses(initialLeadStatuses);

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

        // Initialize leadsCounts from daily_target (the target value user sets)
        // assigned_leads_count is for display only (shows current count), daily_target is what user sets
        const counts: Record<string, number | ''> = {};
        data.forEach((assignment) => {
          // Use daily_target for the input field (what user sets as target)
          // Only set to 0 if daily_target is explicitly 0, otherwise use the value or empty string
          counts[assignment.user_id] = assignment.daily_target !== undefined && assignment.daily_target !== null ? assignment.daily_target : '';
        });
        setLeadsCounts(counts);
        // Store original values as numbers for change detection
        setOriginalLeadsCounts(
          Object.fromEntries(
            Object.entries(counts).map(([k, v]) => [k, typeof v === 'number' ? v : 0])
          )
        );

        // Initialize daily limits state (allow empty for new users)
        const limits: Record<string, number | ''> = {};
        data.forEach((assignment) => {
          // Only set to 0 if daily_limit is explicitly 0, otherwise use the value or empty string
          limits[assignment.user_id] = assignment.daily_limit !== undefined && assignment.daily_limit !== null ? assignment.daily_limit : '';
        });
        setDailyLimits(limits);
        // Store original values as numbers for change detection
        setOriginalDailyLimits(
          Object.fromEntries(
            Object.entries(limits).map(([k, v]) => [k, typeof v === 'number' ? v : 0])
          )
        );
        
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

  // Handle lead source selection for a user
  const handleLeadSourceToggle = (userId: string, leadSource: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setSelectedLeadSources(prev => {
      const current = prev[userId] || [];
      const newSources = current.includes(leadSource)
        ? current.filter(s => s !== leadSource)
        : [...current, leadSource];
      return { ...prev, [userId]: newSources };
    });
  };

  // Handle lead status selection for a user
  const handleLeadStatusToggle = (userId: string, leadStatus: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setSelectedLeadStatuses(prev => {
      const current = prev[userId] || [];
      const newStatuses = current.includes(leadStatus)
        ? current.filter(s => s !== leadStatus)
        : [...current, leadStatus];
      return { ...prev, [userId]: newStatuses };
    });
  };

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
    // Allow empty string to clear the field (user can type to remove 0)
    if (value === '' || value === '-') {
      setLeadsCounts(prev => ({
        ...prev,
        [userId]: ''  // Store empty string to allow clearing
      }));
      return;
    }

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
    // Allow empty string to clear the field (user can type to remove 0)
    if (value === '' || value === '-') {
      setDailyLimits(prev => ({
        ...prev,
        [userId]: ''  // Store empty string to allow clearing
      }));
      return;
    }

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
      const leadSources = selectedLeadSources[userId] || [];
      const leadStatuses = selectedLeadStatuses[userId] || [];
      // Convert empty string to 0 for backend (backend expects number)
      const assignedLeadsCount = (leadsCounts[userId] === '' || leadsCounts[userId] === undefined) ? 0 : (leadsCounts[userId] as number);
      const assignedDailyLimit = (dailyLimits[userId] === '' || dailyLimits[userId] === undefined) ? 0 : (dailyLimits[userId] as number);

      const request: LeadTypeAssignmentRequest = {
        user_id: userId,
        lead_types: leadTypes,
        lead_sources: leadSources,
        lead_statuses: leadStatuses.length > 0 ? leadStatuses : undefined, // Only include if selected
        daily_target: assignedLeadsCount, // Include daily target in the request
        daily_limit: assignedDailyLimit // Include daily limit in the request
      };

      const assignmentsEndpoint = config?.assignmentsEndpoint;
      const response = await leadTypeAssignmentApi.assign(request, assignmentsEndpoint);
      
      // The backend API now handles saving daily_target and daily_limit automatically
      // Use the response from backend to update local state (ensures we have the saved values)
      const savedDailyTarget = response.daily_target ?? assignedLeadsCount;
      const savedDailyLimit = response.daily_limit ?? assignedDailyLimit;
      
      console.log('[LeadTypeAssignment] Save response:', {
        user_id: userId,
        daily_target: savedDailyTarget,
        daily_limit: savedDailyLimit,
        response
      });
      
      // Update local state with saved values from backend response
      // Preserve user_name and user_email from existing assignment or response
      setAssignments(prev =>
        prev.map(assignment =>
          assignment.user_id === userId
            ? {
                ...assignment,
                user_name: response.user_name || assignment.user_name || 'Unknown',
                user_email: response.user_email || assignment.user_email || '',
                lead_types: leadTypes,
                lead_sources: leadSources,
                lead_statuses: leadStatuses,
                daily_target: savedDailyTarget,
                daily_limit: savedDailyLimit
              }
            : assignment
        )
      );
      setSelectedLeadSources(prev => ({ ...prev, [userId]: leadSources }));
      setSelectedLeadStatuses(prev => ({ ...prev, [userId]: leadStatuses }));
      
      // Also update leadsCounts state to reflect the saved daily_target
      setLeadsCounts(prev => ({
        ...prev,
        [userId]: savedDailyTarget
      }));
      
      // Update dailyLimits state to reflect the saved daily_limit
      setDailyLimits(prev => ({
        ...prev,
        [userId]: savedDailyLimit
      }));

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
        lead_types: [],
        lead_sources: [],
        lead_statuses: [],
        daily_target: 0,
        daily_limit: 0
      };

      const assignmentsEndpoint = config?.assignmentsEndpoint;
      const response = await leadTypeAssignmentApi.assign(request, assignmentsEndpoint);
      
      // Update local state - preserve user_name and user_email
      setAssignments(prev =>
        prev.map(assignment =>
          assignment.user_id === userId
            ? {
                ...assignment,
                user_name: response.user_name || assignment.user_name || 'Unknown',
                user_email: response.user_email || assignment.user_email || '',
                lead_types: [],
                lead_sources: [],
                lead_statuses: [],
                daily_target: response.daily_target ?? 0,
                daily_limit: response.daily_limit ?? 0
              }
            : assignment
        )
      );

      setSelectedLeadTypes(prev => ({ ...prev, [userId]: [] }));
      setSelectedLeadSources(prev => ({ ...prev, [userId]: [] }));
      setSelectedLeadStatuses(prev => ({ ...prev, [userId]: [] }));

      // Reset daily_target and daily_limit to 0 in state
      setLeadsCounts(prev => ({
        ...prev,
        [userId]: 0
      }));
      setDailyLimits(prev => ({
        ...prev,
        [userId]: 0
      }));

      // Update original values
      setOriginalLeadsCounts(prev => ({
        ...prev,
        [userId]: 0
      }));
      setOriginalDailyLimits(prev => ({
        ...prev,
        [userId]: 0
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
    const selectedSources = selectedLeadSources[userId] || [];
    const originalSources = currentAssignment?.lead_sources || [];

    const leadTypesChanged = JSON.stringify([...selectedTypes].sort()) !== JSON.stringify([...originalTypes].sort());
    const leadSourcesChanged = JSON.stringify([...selectedSources].sort()) !== JSON.stringify([...originalSources].sort());
    
    const selectedStatuses = selectedLeadStatuses[userId] || [];
    const originalStatuses = currentAssignment?.lead_statuses || [];
    const leadStatusesChanged = JSON.stringify([...selectedStatuses].sort()) !== JSON.stringify([...originalStatuses].sort());

    // Convert empty string to 0 for comparison
    const currentLeadsCount = (leadsCounts[userId] === '' || leadsCounts[userId] === undefined) ? 0 : (leadsCounts[userId] as number);
    const originalLeadsCount = originalLeadsCounts[userId] ?? 0;
    const leadsCountChanged = currentLeadsCount !== originalLeadsCount;

    const currentDailyLimit = (dailyLimits[userId] === '' || dailyLimits[userId] === undefined) ? 0 : (dailyLimits[userId] as number);
    const originalDailyLimit = originalDailyLimits[userId] ?? 0;
    const dailyLimitChanged = currentDailyLimit !== originalDailyLimit;

    return leadTypesChanged || leadSourcesChanged || leadStatusesChanged || leadsCountChanged || dailyLimitChanged;
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
                    <h5>Access Denied</h5>
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
                    <h5>Access Denied</h5>
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
            <h5>Lead Type Assignment</h5>
            <p className="text-muted">
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
        <h5>RM Lead Type Assignments</h5>
        
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h5>No RMs Found</h5>
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
                    <TableHead className="w-[220px]">RM Name & Email</TableHead>
                    <TableHead className="w-[260px]">PARTY</TableHead>
                    <TableHead className="w-[260px]">Lead Source</TableHead>
                    <TableHead className="w-[260px]">Lead Status</TableHead>
                    <TableHead className="w-[120px]">Currently Assigned</TableHead>
                    <TableHead className="w-[120px]">Daily Target</TableHead>
                    <TableHead className="w-[120px]">Daily Limit</TableHead>
                    <TableHead className="w-[180px]">Actions</TableHead>
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
                          <div className="font-semibold">
                            {assignment.user_name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {assignment.user_email || 'No email'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {/* Party (Lead Types) Dropdown */}
                        {availableLeadTypes.length > 0 ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-between text-left font-normal hover:bg-gray-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="truncate">
                                  {(selectedLeadTypes[assignment.user_id] || []).length > 0
                                    ? `${(selectedLeadTypes[assignment.user_id] || []).length} selected`
                                    : 'Select party...'}
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
                                <div className="space-y-2">
                                  {availableLeadTypes.map((leadType) => {
                                    const isSelected = (selectedLeadTypes[assignment.user_id] || []).includes(leadType);
                                    return (
                                      <div
                                        key={leadType}
                                        className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-gray-50 cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleLeadTypeToggle(assignment.user_id, leadType, e);
                                        }}
                                      >
                                        <Checkbox
                                          id={`lt-${assignment.user_id}-${leadType}`}
                                          checked={isSelected}
                                          onCheckedChange={() => handleLeadTypeToggle(assignment.user_id, leadType)}
                                          onClick={(e) => e.stopPropagation()}
                                          className="data-[state=checked]:bg-black data-[state=checked]:border-black border-gray-300"
                                        />
                                        <Label
                                          htmlFor={`lt-${assignment.user_id}-${leadType}`}
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
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <div className="text-xs text-muted-foreground p-2">No party types</div>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {/* Lead Source Dropdown */}
                        {availableLeadSources.length > 0 ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-between text-left font-normal hover:bg-gray-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="truncate">
                                  {(selectedLeadSources[assignment.user_id] || []).length > 0
                                    ? `${(selectedLeadSources[assignment.user_id] || []).length} selected`
                                    : 'Select lead source...'}
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
                                <div className="space-y-2">
                                  {availableLeadSources.map((leadSource) => {
                                    const isSelected = (selectedLeadSources[assignment.user_id] || []).includes(leadSource);
                                    return (
                                      <div
                                        key={leadSource}
                                        className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-gray-50 cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleLeadSourceToggle(assignment.user_id, leadSource, e);
                                        }}
                                      >
                                        <Checkbox
                                          id={`ls-${assignment.user_id}-${leadSource}`}
                                          checked={isSelected}
                                          onCheckedChange={() => handleLeadSourceToggle(assignment.user_id, leadSource)}
                                          onClick={(e) => e.stopPropagation()}
                                          className="data-[state=checked]:bg-black data-[state=checked]:border-black border-gray-300"
                                        />
                                        <Label
                                          htmlFor={`ls-${assignment.user_id}-${leadSource}`}
                                          className="text-sm font-normal cursor-pointer flex-1"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleLeadSourceToggle(assignment.user_id, leadSource, e);
                                          }}
                                        >
                                          {leadSource}
                                        </Label>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <div className="text-xs text-muted-foreground p-2">No lead sources</div>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {/* Lead Status Dropdown */}
                        {availableLeadStatuses.length > 0 ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-between text-left font-normal hover:bg-gray-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="truncate">
                                  {(selectedLeadStatuses[assignment.user_id] || []).length > 0
                                    ? `${(selectedLeadStatuses[assignment.user_id] || []).length} selected`
                                    : 'Select lead status...'}
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
                                <div className="space-y-2">
                                  {availableLeadStatuses.map((leadStatus) => {
                                    const isSelected = (selectedLeadStatuses[assignment.user_id] || []).includes(leadStatus);
                                    return (
                                      <div
                                        key={leadStatus}
                                        className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-gray-50 cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleLeadStatusToggle(assignment.user_id, leadStatus, e);
                                        }}
                                      >
                                        <Checkbox
                                          id={`lstatus-${assignment.user_id}-${leadStatus}`}
                                          checked={isSelected}
                                          onCheckedChange={() => handleLeadStatusToggle(assignment.user_id, leadStatus)}
                                          onClick={(e) => e.stopPropagation()}
                                          className="data-[state=checked]:bg-black data-[state=checked]:border-black border-gray-300"
                                        />
                                        <Label
                                          htmlFor={`lstatus-${assignment.user_id}-${leadStatus}`}
                                          className="text-sm font-normal cursor-pointer flex-1"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleLeadStatusToggle(assignment.user_id, leadStatus, e);
                                          }}
                                        >
                                          {leadStatus}
                                        </Label>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <div className="text-xs text-muted-foreground p-2">No lead statuses</div>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {/* Currently Assigned Badges */}
                        <div className="flex flex-wrap gap-1">
                          {assignment.lead_types.length > 0 ? (
                            assignment.lead_types.map((leadType) => (
                              <Badge key={leadType} className="text-xs bg-black text-white border-none hover:bg-black">
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
                          value={leadsCounts[assignment.user_id] ?? ''}
                          onChange={(e) => handleLeadsCountChange(assignment.user_id, e.target.value)}
                          onBlur={(e) => {
                            // If empty on blur, set to 0 for display
                            if (e.target.value === '' || leadsCounts[assignment.user_id] === '') {
                              setLeadsCounts(prev => ({
                                ...prev,
                                [assignment.user_id]: 0
                              }));
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Input
                          type="number"
                          min="0"
                          value={dailyLimits[assignment.user_id] ?? ''}
                          onChange={(e) => handleDailyLimitChange(assignment.user_id, e.target.value)}
                          onBlur={(e) => {
                            // If empty on blur, set to 0 for display
                            if (e.target.value === '' || dailyLimits[assignment.user_id] === '') {
                              setDailyLimits(prev => ({
                                ...prev,
                                [assignment.user_id]: 0
                              }));
                            }
                          }}
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
                            className="w-full bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
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
                            disabled={(assignment.lead_types?.length ?? 0) === 0 && (assignment.lead_sources?.length ?? 0) === 0 && (assignment.lead_statuses?.length ?? 0) === 0 || saving === assignment.user_id}
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
