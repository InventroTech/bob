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
import { Loader2, Users, Settings, AlertCircle, Trash2 } from 'lucide-react';
import { 
  LeadTypeAssignment, 
  LeadTypeAssignmentRequest, 
  AVAILABLE_LEAD_TYPES,
  LeadType 
} from '@/types/userSettings';
import { leadTypeAssignmentApi } from '@/lib/userSettingsApi';

interface LeadTypeAssignmentPageProps {
  // Optional props for when used as a page component
  className?: string;
  showHeader?: boolean;
}

const LeadTypeAssignmentPage = ({ className = '', showHeader = true }: LeadTypeAssignmentPageProps) => {
  const { user } = useAuth();
  const { role, customRole } = useTenant();
  const [assignments, setAssignments] = useState<LeadTypeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedLeadTypes, setSelectedLeadTypes] = useState<Record<string, LeadType[]>>({});

  // Check if user has GM permissions (GM custom role only)
  const isGM = customRole === 'GM';
  
  // Debug logging
  console.log('LeadTypeAssignmentPage: User role info:', {
    user: user?.id,
    role,
    customRole,
    isGM,
    userEmail: user?.email
  });

  // Fetch lead type assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const data = await leadTypeAssignmentApi.getAll();
        setAssignments(data);
        
        // Initialize selected lead types
        const initialSelections: Record<string, LeadType[]> = {};
        data.forEach(assignment => {
          initialSelections[assignment.user_id] = assignment.lead_types as LeadType[];
        });
        setSelectedLeadTypes(initialSelections);
      } catch (error: any) {
        console.error('Error fetching lead type assignments:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          response: error.response
        });
        toast.error(`Failed to fetch lead type assignments: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (user && isGM) {
      fetchAssignments();
    } else if (user && !isGM) {
      // User is authenticated but not a GM, stop loading
      setLoading(false);
    }
  }, [user, isGM]);

  // Handle lead type selection for a user
  const handleLeadTypeToggle = (userId: string, leadType: LeadType) => {
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

      await leadTypeAssignmentApi.assign(request);
      
      // Update local state
      setAssignments(prev => 
        prev.map(assignment => 
          assignment.user_id === userId 
            ? { ...assignment, lead_types: leadTypes }
            : assignment
        )
      );

      toast.success('Lead type assignment saved successfully');
    } catch (error) {
      console.error('Error saving lead type assignment:', error);
      toast.error('Failed to save lead type assignment');
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

      await leadTypeAssignmentApi.assign(request);
      
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
    } catch (error) {
      console.error('Error removing lead type assignments:', error);
      toast.error('Failed to remove lead type assignments');
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

  // Check access after all hooks are called
  if (!isGM) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
                    <p className="text-muted-foreground text-center">
                      You need GM (General Manager) role or Owner role to access this page.
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

  if (loading) {
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
                    <TableHead className="w-[200px]">Actions</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.user_id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{assignment.user_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {assignment.user_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          {/* Lead Type Checkboxes */}
                          <div className="grid grid-cols-2 gap-2">
                            {AVAILABLE_LEAD_TYPES.map((leadType) => {
                              const isSelected = (selectedLeadTypes[assignment.user_id] || []).includes(leadType);
                              return (
                                <div key={leadType} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`${assignment.user_id}-${leadType}`}
                                    checked={isSelected}
                                    onCheckedChange={() => handleLeadTypeToggle(assignment.user_id, leadType)}
                                  />
                                  <Label 
                                    htmlFor={`${assignment.user_id}-${leadType}`}
                                    className="text-xs font-normal cursor-pointer"
                                  >
                                    {leadType.replace(/_/g, ' ')}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Currently Assigned Badges */}
                          <div className="mt-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Currently Assigned:</p>
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
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-2">
                          <Button
                            onClick={() => handleSaveAssignment(assignment.user_id)}
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
                            onClick={() => handleRemoveAllAssignments(assignment.user_id)}
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
                      <TableCell>
                        {hasChanges(assignment.user_id) ? (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            Unsaved
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Saved
                          </Badge>
                        )}
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
