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
  const [leadsCounts, setLeadsCounts] = useState<Record<string, number | ''>>({});
  const [originalLeadsCounts, setOriginalLeadsCounts] = useState<Record<string, number>>({});
  const [dailyLimits, setDailyLimits] = useState<Record<string, number | ''>>({});
  const [originalDailyLimits, setOriginalDailyLimits] = useState<Record<string, number>>({});

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
        
        // Fetch lead type assignments (now returns TenantMembership-based data)
        const rmsEndpoint = config?.rmsEndpoint;
        const data = await leadTypeAssignmentApi.getAll(rmsEndpoint);
        setAssignments(data);
        
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
      // Convert empty string to 0 for backend (backend expects number)
      const assignedLeadsCount = (leadsCounts[userId] === '' || leadsCounts[userId] === undefined) ? 0 : (leadsCounts[userId] as number);
      const assignedDailyLimit = (dailyLimits[userId] === '' || dailyLimits[userId] === undefined) ? 0 : (dailyLimits[userId] as number);
      
      const request: LeadTypeAssignmentRequest = {
        user_id: userId,
        lead_types: leadTypes,
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
                daily_target: savedDailyTarget, 
                daily_limit: savedDailyLimit 
              }
            : assignment
        )
      );
      
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
        lead_types: [], // Empty array to remove all assignments
        daily_target: 0, // Also reset daily_target to 0
        daily_limit: 0   // Also reset daily_limit to 0
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
                daily_target: response.daily_target ?? 0,
                daily_limit: response.daily_limit ?? 0
              }
            : assignment
        )
      );

      // Clear selected lead types for this user
      setSelectedLeadTypes(prev => ({
        ...prev,
        [userId]: []
      }));

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
    
    const leadTypesChanged = JSON.stringify(selectedTypes.sort()) !== JSON.stringify(originalTypes.sort());
    
    // Convert empty string to 0 for comparison
    const currentLeadsCount = (leadsCounts[userId] === '' || leadsCounts[userId] === undefined) ? 0 : (leadsCounts[userId] as number);
    const originalLeadsCount = originalLeadsCounts[userId] ?? 0;
    const leadsCountChanged = currentLeadsCount !== originalLeadsCount;

    const currentDailyLimit = (dailyLimits[userId] === '' || dailyLimits[userId] === undefined) ? 0 : (dailyLimits[userId] as number);
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
                          <div className="font-semibold">
                            {assignment.user_name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {assignment.user_email || 'No email'}
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
