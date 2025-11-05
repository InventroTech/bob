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

  // Check if user has GM permissions (GM custom role only)
  // Strictly check: must be exactly 'GM', not null, undefined, or any other value
  const isGM = customRole === 'GM' || customRole === 'gm' || customRole?.toUpperCase() === 'GM';
  
  // Track when role has been checked (after a short delay to allow useTenant to extract from token)
  useEffect(() => {
    if (user) {
      // useTenant now extracts from token synchronously, so we can check immediately
      // But add a small delay to ensure token is processed
      const timer = setTimeout(() => {
        setRoleChecked(true);
      }, 100); // Reduced delay since token extraction is now synchronous
      
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
        
        // Fetch available lead types from records' poster field
        // If no endpoint is configured, getAvailableLeadTypes will use the default: /user-settings/lead-types/
        const leadTypesEndpoint = config?.leadTypesEndpoint;
        const leadTypes = await leadTypeAssignmentApi.getAvailableLeadTypes(leadTypesEndpoint);
        setAvailableLeadTypes(leadTypes);
        
        // Fetch lead type assignments
        // If no endpoint is configured, getAll will use the default: /accounts/users/assignees-by-role/?role=RM
        const rmsEndpoint = config?.rmsEndpoint;
        const data = await leadTypeAssignmentApi.getAll(rmsEndpoint);
        setAssignments(data);
        
        // Initialize selected lead types
        const initialSelections: Record<string, LeadType[]> = {};
        data.forEach(assignment => {
          initialSelections[assignment.user_id] = assignment.lead_types as LeadType[];
        });
        setSelectedLeadTypes(initialSelections);
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
  const handleLeadTypeToggle = (userId: string, leadType: LeadType, e?: React.MouseEvent) => {
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

  // Save lead type assignment for a user
  const handleSaveAssignment = async (userId: string) => {
    try {
      setSaving(userId);
      const leadTypes = selectedLeadTypes[userId] || [];
      
      const request: LeadTypeAssignmentRequest = {
        user_id: userId,
        lead_types: leadTypes
      };

      const assignmentsEndpoint = config?.assignmentsEndpoint;
      await leadTypeAssignmentApi.assign(request, assignmentsEndpoint);
      
      // Update local state
      setAssignments(prev => 
        prev.map(assignment => 
          assignment.user_id === userId 
            ? { ...assignment, lead_types: leadTypes }
            : assignment
        )
      );

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
    
    return JSON.stringify(selectedTypes.sort()) !== JSON.stringify(originalTypes.sort());
  };

  // Early access check - block non-GM users immediately
  // Once role is checked and user is not GM, show access denied
  // Also block if we have a non-GM role explicitly set
  if (user && roleChecked && !isGM) {
    // Check if customRole is null (token might not be enriched)
    const tokenNotEnriched = customRole === null;
    
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            {tokenNotEnriched ? (
              <>
                <p className="text-muted-foreground text-center mb-4">
                  Your session token doesn't contain role information. Please log out and log back in to refresh your token.
                </p>
                <div className="mt-4 p-3 bg-muted rounded text-sm">
                  <p><strong>Note:</strong> This usually happens if you logged in before the latest update. Logging out and back in will fix this.</p>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center">
                You need GM (General Manager) role to access this page.
              </p>
            )}
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
  // Also check if customRole is null but we haven't finished checking yet
  if (loading || !user || (!roleChecked && customRole === null)) {
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
