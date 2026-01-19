import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, Settings, AlertCircle, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { leadTypeAssignmentApi } from '@/lib/userSettingsApi';

interface CallAttemptMatrix {
  id?: number;
  lead_type: string;
  max_call_attempts: number;
  sla_days: number;
  min_time_between_calls_hours: number;
  created_at?: string;
  updated_at?: string;
}

interface CallAttemptMatrixPageProps {
  className?: string;
  showHeader?: boolean;
  config?: {
    apiEndpoint?: string;
    leadTypesEndpoint?: string;
    title?: string;
  };
}

const CallAttemptMatrixPage = ({ className = '', showHeader = true, config }: CallAttemptMatrixPageProps) => {
  const { user } = useAuth();
  const { role, customRole } = useTenant();
  const [matrices, setMatrices] = useState<CallAttemptMatrix[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newRow, setNewRow] = useState<Partial<CallAttemptMatrix> | null>(null);
  const [availableLeadTypes, setAvailableLeadTypes] = useState<string[]>([]);

  // Check if user has GM permissions
  const isGM = customRole === 'GM' || customRole === 'gm' || customRole?.toUpperCase() === 'GM';

  // Fetch call attempt matrices and available lead types
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !isGM) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch available lead types from records' affiliated_party field (same as Lead Assignment page)
        const leadTypesEndpoint = config?.leadTypesEndpoint;
        const leadTypes = await leadTypeAssignmentApi.getAvailableLeadTypes(leadTypesEndpoint);
        setAvailableLeadTypes(leadTypes);

        // Fetch call attempt matrices
        const apiEndpoint = config?.apiEndpoint || '/crm-records/call-attempt-matrix/';
        const response = await apiClient.get(apiEndpoint);
        setMatrices(response.data || []);
      } catch (error: any) {
        console.error('Error fetching call attempt matrix data:', error);
        toast.error(`Failed to fetch data: ${error.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    if (user && isGM) {
      fetchData();
    } else if (user && !isGM) {
      setLoading(false);
    }
  }, [user, isGM]);

  // Handle input change for editing
  const handleInputChange = (id: number | 'new', field: keyof CallAttemptMatrix, value: string | number) => {
    if (id === 'new') {
      setNewRow(prev => ({
        ...prev,
        [field]: field === 'lead_type' ? value : (value === '' ? undefined : Number(value))
      }));
    } else {
      setMatrices(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, [field]: field === 'lead_type' ? value : Number(value) }
            : item
        )
      );
    }
  };

  // Handle save
  const handleSave = async (matrix: CallAttemptMatrix) => {
    try {
      setSaving(matrix.id || 0);

      // Ensure all numeric fields are valid numbers (not undefined or 0)
      if (!matrix.max_call_attempts || matrix.max_call_attempts <= 0) {
        toast.error('Max call attempts must be greater than 0');
        return;
      }
      if (!matrix.sla_days || matrix.sla_days <= 0) {
        toast.error('SLA days must be greater than 0');
        return;
      }
      if (!matrix.min_time_between_calls_hours || matrix.min_time_between_calls_hours <= 0) {
        toast.error('Minimum time between calls must be greater than 0');
        return;
      }

      const apiEndpoint = config?.apiEndpoint || '/crm-records/call-attempt-matrix/';
      if (matrix.id) {
        // Update existing
        await apiClient.put(`${apiEndpoint}${matrix.id}/`, matrix);
        toast.success('Call attempt matrix updated successfully');
        setEditingId(null);
      } else {
        // Create new
        const response = await apiClient.post(apiEndpoint, matrix);
        setMatrices(prev => [...prev, response.data]);
        toast.success('Call attempt matrix created successfully');
        setNewRow(null);
      }
    } catch (error: any) {
      console.error('Error saving call attempt matrix:', error);
      toast.error(`Failed to save: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    } finally {
      setSaving(null);
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this call attempt matrix configuration?')) {
      return;
    }

    try {
      setSaving(id);
      const apiEndpoint = config?.apiEndpoint || '/crm-records/call-attempt-matrix/';
      await apiClient.delete(`${apiEndpoint}${id}/`);
      setMatrices(prev => prev.filter(item => item.id !== id));
      toast.success('Call attempt matrix deleted successfully');
    } catch (error: any) {
      console.error('Error deleting call attempt matrix:', error);
      toast.error(`Failed to delete: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    } finally {
      setSaving(null);
    }
  };

  // Handle add new row
  const handleAddNew = () => {
    setNewRow({
      lead_type: '',
      max_call_attempts: undefined,
      sla_days: undefined,
      min_time_between_calls_hours: undefined
    });
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingId(null);
    // Reload data to reset changes
    const fetchData = async () => {
      try {
        const apiEndpoint = config?.apiEndpoint || '/crm-records/call-attempt-matrix/';
        const response = await apiClient.get(apiEndpoint);
        setMatrices(response.data || []);
      } catch (error) {
        console.error('Error reloading data:', error);
      }
    };
    fetchData();
  };

  // Handle cancel new
  const handleCancelNew = () => {
    setNewRow(null);
  };

  // Early access check
  if (user && !isGM) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="mb-2">Access Denied</h3>
            <p className="text-muted-foreground text-center">
              You need GM (General Manager) role to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading call attempt matrix...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h3>{config?.title || 'Call Attempt Matrix'}</h3>
            <p className="text-muted-foreground">
              Configure call attempt limits, SLA, and minimum time between calls per lead type
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">GM Settings</span>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{config?.title || 'Call Attempt Matrix Configuration'}</CardTitle>
              <CardDescription className="text-gray-600">
                Define max call attempts, SLA in days, and minimum time between calls for each lead type
              </CardDescription>
            </div>
            <Button 
              variant="outline"
              onClick={handleAddNew} 
              disabled={newRow !== null}
              className="hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Lead Type</TableHead>
                <TableHead className="w-[150px]">Max Call Attempts (m)</TableHead>
                <TableHead className="w-[150px]">SLA in Days (n)</TableHead>
                <TableHead className="w-[200px]">Min Time Between Calls (Hours) (K)</TableHead>
                <TableHead className="w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* New row */}
              {newRow && (
                <TableRow>
                  <TableCell>
                    <Input
                      type="text"
                      value={newRow.lead_type || ''}
                      onChange={(e) => handleInputChange('new', 'lead_type', e.target.value)}
                      placeholder="Enter lead type"
                      list="lead-types"
                    />
                    <datalist id="lead-types">
                      {availableLeadTypes.map((type) => (
                        <option key={type} value={type} />
                      ))}
                    </datalist>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={newRow.max_call_attempts ?? ''}
                      onChange={(e) => handleInputChange('new', 'max_call_attempts', e.target.value)}
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={newRow.sla_days ?? ''}
                      onChange={(e) => handleInputChange('new', 'sla_days', e.target.value)}
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      max="168"
                      value={newRow.min_time_between_calls_hours ?? ''}
                      onChange={(e) => handleInputChange('new', 'min_time_between_calls_hours', e.target.value)}
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSave(newRow as CallAttemptMatrix)}
                        disabled={saving !== null || !newRow.lead_type || !newRow.max_call_attempts || newRow.max_call_attempts <= 0 || !newRow.sla_days || newRow.sla_days <= 0 || !newRow.min_time_between_calls_hours || newRow.min_time_between_calls_hours <= 0}
                        className="hover:bg-muted hover:text-foreground"
                      >
                        {saving === 0 ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelNew}
                        disabled={saving !== null}
                        className="hover:bg-muted hover:text-foreground"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* Existing rows */}
              {matrices.map((matrix) => (
                <TableRow key={matrix.id}>
                  <TableCell className="font-medium">
                    {editingId === matrix.id ? (
                      <Input
                        type="text"
                        value={matrix.lead_type}
                        onChange={(e) => handleInputChange(matrix.id!, 'lead_type', e.target.value)}
                        list="lead-types-edit"
                      />
                    ) : (
                      matrix.lead_type
                    )}
                    {editingId === matrix.id && (
                      <datalist id="lead-types-edit">
                        {availableLeadTypes.map((type) => (
                          <option key={type} value={type} />
                        ))}
                      </datalist>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === matrix.id ? (
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={matrix.max_call_attempts}
                        onChange={(e) => handleInputChange(matrix.id!, 'max_call_attempts', e.target.value)}
                      />
                    ) : (
                      matrix.max_call_attempts
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === matrix.id ? (
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={matrix.sla_days}
                        onChange={(e) => handleInputChange(matrix.id!, 'sla_days', e.target.value)}
                      />
                    ) : (
                      matrix.sla_days
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === matrix.id ? (
                      <Input
                        type="number"
                        min="1"
                        max="168"
                        value={matrix.min_time_between_calls_hours}
                        onChange={(e) => handleInputChange(matrix.id!, 'min_time_between_calls_hours', e.target.value)}
                      />
                    ) : (
                      matrix.min_time_between_calls_hours
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === matrix.id ? (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSave(matrix)}
                          disabled={saving === matrix.id}
                          className="hover:bg-muted hover:text-foreground"
                        >
                          {saving === matrix.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={saving === matrix.id}
                          className="hover:bg-muted hover:text-foreground"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(matrix.id!)}
                          disabled={saving !== null}
                          className="hover:bg-muted hover:text-foreground"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(matrix.id!)}
                          disabled={saving === matrix.id}
                          className="hover:bg-muted hover:text-foreground"
                        >
                          {saving === matrix.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {matrices.length === 0 && !newRow && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No call attempt matrix configurations found. Click "Add New" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CallAttemptMatrixPage;
