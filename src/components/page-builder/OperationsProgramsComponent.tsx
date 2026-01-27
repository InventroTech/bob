import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomButton } from '@/components/ui/CustomButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Database, Plus, Edit, Play, Trash2, Loader2, Code, Terminal } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface Operation {
  id: string;
  title: string;
  payload?: string;
  reqType: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  category: string;
  bearerToken?: string;
  tokenSource?: 'session' | 'custom' | 'none';
  script?: string;
}

interface OperationsProgramsComponentProps {
  config?: {
    apiEndpoint?: string;
    title?: string;
    categories?: string[];
  };
}

export const OperationsProgramsComponent: React.FC<OperationsProgramsComponentProps> = ({
  config = {}
}) => {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('db-interaction');
  const [operations, setOperations] = useState<Operation[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningScript, setIsRunningScript] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    payload: '',
    reqType: 'GET' as Operation['reqType'],
    endpoint: '',
    bearerToken: '',
    tokenSource: 'none' as 'session' | 'custom' | 'none',
    script: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const componentTitle = config?.title || 'Operations & Programs';
  const apiEndpoint = config?.apiEndpoint || '/api/operations';
  const categoriesConfig = config?.categories;
  const categories = Array.isArray(categoriesConfig) 
    ? categoriesConfig 
    : typeof categoriesConfig === 'string' && categoriesConfig.trim()
    ? categoriesConfig.split(',').map(c => c.trim()).filter(Boolean)
    : ['DB interaction', 'API Calls', 'Scripts'];

  // Fetch operations
  const fetchOperations = async () => {
    try {
      // TODO: Replace with actual API call
      // For now, using localStorage as a simple storage
      const stored = localStorage.getItem(`operations_${activeTab}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure backward compatibility - add default values for new fields
        const migrated = parsed.map((op: Operation) => ({
          ...op,
          tokenSource: op.tokenSource || (op.bearerToken ? 'custom' : 'none'),
          script: op.script || undefined,
        }));
        setOperations(migrated);
      } else {
        setOperations([]);
      }
    } catch (error: any) {
      console.error('Error fetching operations:', error);
      toast.error(`Failed to load operations: ${error.message || 'Unknown error'}`);
    }
  };

  useEffect(() => {
    fetchOperations();
  }, [activeTab]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.endpoint.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const newOperation: Operation = {
        id: editingId || `op-${Date.now()}`,
        title: formData.title.trim(),
        payload: formData.payload?.trim() || undefined,
        reqType: formData.reqType,
        endpoint: formData.endpoint.trim(),
        category: activeTab,
        bearerToken: formData.tokenSource === 'custom' ? (formData.bearerToken?.trim() || undefined) : undefined,
        tokenSource: formData.tokenSource,
        script: formData.script?.trim() || undefined,
      };

      let updatedOperations: Operation[];
      if (editingId) {
        updatedOperations = operations.map(op => 
          op.id === editingId ? newOperation : op
        );
        toast.success('Operation updated successfully!');
      } else {
        updatedOperations = [...operations, newOperation];
        toast.success('Operation created successfully!');
      }

      // Save to localStorage (replace with API call)
      localStorage.setItem(`operations_${activeTab}`, JSON.stringify(updatedOperations));
      setOperations(updatedOperations);
      
      // Reset form
      setFormData({
        title: '',
        payload: '',
        reqType: 'GET',
        endpoint: '',
        bearerToken: '',
        tokenSource: 'none',
        script: '',
      });
      setEditingId(null);
      setIsFormOpen(false);
      
      // Select the new/updated operation
      setSelectedOperation(newOperation);
    } catch (error: any) {
      console.error('Error saving operation:', error);
      toast.error(`Failed to save operation: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit
  const handleEdit = (operation: Operation) => {
    setFormData({
      title: operation.title,
      payload: operation.payload || '',
      reqType: operation.reqType,
      endpoint: operation.endpoint,
      bearerToken: operation.bearerToken || '',
      tokenSource: operation.tokenSource || 'none',
      script: operation.script || '',
    });
    setEditingId(operation.id);
    setIsFormOpen(true);
    setSelectedOperation(operation);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const updatedOperations = operations.filter(op => op.id !== deleteId);
      localStorage.setItem(`operations_${activeTab}`, JSON.stringify(updatedOperations));
      setOperations(updatedOperations);
      
      if (selectedOperation?.id === deleteId) {
        setSelectedOperation(null);
      }
      
      toast.success('Operation deleted successfully!');
      setDeleteId(null);
    } catch (error: any) {
      console.error('Error deleting operation:', error);
      toast.error(`Failed to delete operation: ${error.message || 'Unknown error'}`);
    }
  };

  // Handle run operation
  const handleRun = async () => {
    if (!selectedOperation) return;

    setIsRunning(true);
    try {
      // Build headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Add Bearer token based on token source
      if (selectedOperation.tokenSource === 'session' && session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else if (selectedOperation.tokenSource === 'custom' && selectedOperation.bearerToken) {
        headers['Authorization'] = `Bearer ${selectedOperation.bearerToken}`;
      }

      // TODO: Implement actual API call based on reqType and endpoint
      const response = await fetch(selectedOperation.endpoint, {
        method: selectedOperation.reqType,
        headers,
        body: selectedOperation.payload ? JSON.stringify(JSON.parse(selectedOperation.payload)) : undefined,
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Operation executed successfully!');
        console.log('Operation result:', data);
      } else {
        throw new Error(`Operation failed with status: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Error running operation:', error);
      toast.error(`Failed to run operation: ${error.message || 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Handle run script
  const handleRunScript = async () => {
    if (!selectedOperation || !selectedOperation.script) return;

    setIsRunningScript(true);
    try {
      // First run the API call if endpoint exists
      let responseData: any = null;
      let responseStatus: number | null = null;
      let responseHeaders: Headers | null = null;
      
      if (selectedOperation.endpoint) {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (selectedOperation.tokenSource === 'session' && session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        } else if (selectedOperation.tokenSource === 'custom' && selectedOperation.bearerToken) {
          headers['Authorization'] = `Bearer ${selectedOperation.bearerToken}`;
        }

        const response = await fetch(selectedOperation.endpoint, {
          method: selectedOperation.reqType,
          headers,
          body: selectedOperation.payload ? JSON.stringify(JSON.parse(selectedOperation.payload)) : undefined,
        });

        responseStatus = response.status;
        responseHeaders = response.headers;
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
          } else {
            responseData = await response.text();
          }
        } else {
          try {
            responseData = await response.json();
          } catch {
            responseData = await response.text();
          }
        }
      }

      // Execute the script with context
      const scriptFunction = new Function(
        'response',
        'responseStatus',
        'responseHeaders',
        'operation',
        'console',
        'toast',
        `
        try {
          ${selectedOperation.script}
        } catch (error) {
          console.error('Script execution error:', error);
          throw error;
        }
        `
      );
      
      scriptFunction(
        responseData,
        responseStatus,
        responseHeaders,
        selectedOperation,
        console,
        toast
      );
      
      toast.success('Script executed successfully!');
    } catch (error: any) {
      console.error('Error running script:', error);
      toast.error(`Failed to run script: ${error.message || 'Unknown error'}`);
    } finally {
      setIsRunningScript(false);
    }
  };

  // Cancel form
  const handleCancelForm = () => {
    setFormData({
      title: '',
      payload: '',
      reqType: 'GET',
      endpoint: '',
      bearerToken: '',
      tokenSource: 'none',
      script: '',
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  // Get operations for current tab
  const currentOperations = operations.filter(op => op.category === activeTab);

  return (
    <div className="w-full h-full flex gap-4">
      {/* Left Panel - Operations List */}
      <div className="w-80 flex flex-col border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <CustomButton
            onClick={() => {
              setFormData({
                title: '',
                payload: '',
                reqType: 'GET',
                endpoint: '',
              });
              setEditingId(null);
              setIsFormOpen(true);
            }}
            icon={<Plus className="h-4 w-4" />}
            className="w-full bg-black text-white hover:bg-gray-800"
          >
            Add operation
          </CustomButton>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {currentOperations.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No operations yet
            </div>
          ) : (
            <div className="space-y-2">
              {currentOperations.map((operation) => (
                <div
                  key={operation.id}
                  onClick={() => setSelectedOperation(operation)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedOperation?.id === operation.id
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm text-black">
                    {operation.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {operation.reqType} • {operation.endpoint}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Form and Details */}
      <div className="flex-1 flex flex-col">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start border-b border-gray-200 rounded-none h-auto p-0">
            {categories.map((category) => (
              <TabsTrigger
                key={category}
                value={category.toLowerCase().replace(/\s+/g, '-')}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 flex gap-4 mt-4">
            {/* Form Panel */}
            {isFormOpen && (
              <div className="w-96 border-r border-gray-200 pr-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {editingId ? 'Edit operation' : 'Add a new operation'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Operation title"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="payload">Payload if needed</Label>
                        <Textarea
                          id="payload"
                          value={formData.payload}
                          onChange={(e) => setFormData({ ...formData, payload: e.target.value })}
                          placeholder='{"key": "value"}'
                          rows={4}
                          className="font-mono text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reqType">Req type</Label>
                        <Select
                          value={formData.reqType}
                          onValueChange={(value) => setFormData({ ...formData, reqType: value as Operation['reqType'] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                            <SelectItem value="PATCH">PATCH</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="endpoint">Endpoint</Label>
                        <Input
                          id="endpoint"
                          value={formData.endpoint}
                          onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                          placeholder="/api/endpoint"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tokenSource">Bearer Token Source</Label>
                        <Select
                          value={formData.tokenSource}
                          onValueChange={(value) => setFormData({ ...formData, tokenSource: value as 'session' | 'custom' | 'none' })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="session">From Login Session</SelectItem>
                            <SelectItem value="custom">Custom Token</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                          {formData.tokenSource === 'session' && 'Will use your current login session token'}
                          {formData.tokenSource === 'custom' && 'Enter a custom Bearer token'}
                          {formData.tokenSource === 'none' && 'No authentication token will be sent'}
                        </p>
                      </div>

                      {formData.tokenSource === 'custom' && (
                        <div className="space-y-2">
                          <Label htmlFor="bearerToken">Custom Bearer Token</Label>
                          <Input
                            id="bearerToken"
                            type="password"
                            value={formData.bearerToken}
                            onChange={(e) => setFormData({ ...formData, bearerToken: e.target.value })}
                            placeholder="Enter your Bearer token"
                          />
                          <p className="text-xs text-gray-500">
                            Token will be sent as Authorization: Bearer {`{token}`} header
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="script">Script (optional)</Label>
                        <Textarea
                          id="script"
                          value={formData.script}
                          onChange={(e) => setFormData({ ...formData, script: e.target.value })}
                          placeholder="JavaScript code to execute after API call"
                          rows={6}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500">
                          Optional JavaScript code that runs after the API call. Available variables: response, responseStatus, responseHeaders, operation, console, toast
                        </p>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <CustomButton
                          type="submit"
                          disabled={isSubmitting}
                          loading={isSubmitting}
                          className="flex-1 bg-black text-white hover:bg-gray-800"
                        >
                          Save
                        </CustomButton>
                        <CustomButton
                          type="button"
                          variant="outline"
                          onClick={handleCancelForm}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </CustomButton>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Details Panel */}
            <div className="flex-1">
              {selectedOperation ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Operation details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Title</Label>
                      <div className="mt-1 text-base font-medium text-black">
                        {selectedOperation.title}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-500">Request Type</Label>
                      <div className="mt-1 text-base text-black">
                        {selectedOperation.reqType}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-500">Endpoint</Label>
                      <div className="mt-1 text-base font-mono text-black break-all">
                        {selectedOperation.endpoint}
                      </div>
                    </div>

                    {selectedOperation.payload && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Payload</Label>
                        <div className="mt-1 p-3 bg-gray-50 rounded border border-gray-200">
                          <pre className="text-sm font-mono text-black whitespace-pre-wrap break-words">
                            {selectedOperation.payload}
                          </pre>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label className="text-sm font-medium text-gray-500">Bearer Token Source</Label>
                      <div className="mt-1 text-base text-black">
                        {selectedOperation.tokenSource === 'session' && 'From Login Session'}
                        {selectedOperation.tokenSource === 'custom' && 'Custom Token'}
                        {selectedOperation.tokenSource === 'none' && 'None'}
                        {!selectedOperation.tokenSource && 'None'}
                      </div>
                      {selectedOperation.tokenSource === 'custom' && selectedOperation.bearerToken && (
                        <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                          <code className="text-sm font-mono text-black break-all">
                            {selectedOperation.bearerToken.length > 20
                              ? `${selectedOperation.bearerToken.substring(0, 8)}...${selectedOperation.bearerToken.substring(selectedOperation.bearerToken.length - 4)}`
                              : '••••••••••••'}
                          </code>
                          <p className="text-xs text-gray-500 mt-1">
                            Token is partially masked for security. Edit to view or change.
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedOperation.script && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Script</Label>
                        <div className="mt-1 p-3 bg-gray-50 rounded border border-gray-200">
                          <pre className="text-sm font-mono text-black whitespace-pre-wrap break-words">
                            {selectedOperation.script}
                          </pre>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex gap-2">
                        <CustomButton
                          onClick={() => handleEdit(selectedOperation)}
                          icon={<Edit className="h-4 w-4" />}
                          variant="outline"
                          className="flex-1"
                        >
                          Edit
                        </CustomButton>
                        <CustomButton
                          onClick={handleRun}
                          disabled={isRunning || !selectedOperation.endpoint}
                          loading={isRunning}
                          icon={<Play className="h-4 w-4" />}
                          className="flex-1 bg-black text-white hover:bg-gray-800"
                        >
                          Run API
                        </CustomButton>
                        <CustomButton
                          onClick={() => setDeleteId(selectedOperation.id)}
                          icon={<Trash2 className="h-4 w-4" />}
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        />
                      </div>
                      
                      {selectedOperation.script && (
                        <div className="pt-2 border-t">
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">
                            <Code className="h-4 w-4 inline mr-1" />
                            Script Execution
                          </Label>
                          <CustomButton
                            onClick={handleRunScript}
                            disabled={isRunningScript}
                            loading={isRunningScript}
                            icon={<Terminal className="h-4 w-4" />}
                            className="w-full bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Run Script
                          </CustomButton>
                          <p className="text-xs text-gray-500 mt-2">
                            Executes the API call (if endpoint exists) and then runs the script with response data.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-64 text-gray-500">
                    Select an operation to view details
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Operation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this operation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OperationsProgramsComponent;
