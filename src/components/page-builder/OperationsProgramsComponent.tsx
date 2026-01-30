import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomButton } from '@/components/ui/CustomButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Play, Trash2, Loader2, Plus, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient, createApiClient } from '@/lib/api/client';
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

const TENANT_ID = 'e35e7279-d92d-4cdf-8014-98deaab639c0';
const PUSH_LEADS_API_PREFIX = 'https://pyro-backend-1.onrender.com';
const pushLeadsClient = createApiClient(PUSH_LEADS_API_PREFIX);

export interface ApiCallOperation {
  id: string;
  title: string;
  reqType: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  payload?: string;
}

interface OperationsProgramsComponentProps {
  config?: { title?: string };
}

// Generate one random lead payload
function generateRandomLead(): Record<string, unknown> {
  const firstNames = ['Rajagopalam', 'Anand', 'Sanjay', 'Meena', 'Priya', 'Vikram', 'Quincy', 'Chaitanya', 'Udyati', 'Vedika', 'Jack', 'Rahul', 'Sneha', 'Arjun', 'Kavya'];
  const lastNames = ['Pinninti', 'Reddy', 'Sharma', 'Kaur', 'Jain', 'Verma', 'Khatri', 'Chhabra', 'Bedi', 'Mitra', 'Mahajan', 'Patel', 'Singh', 'Kumar', 'Gupta'];
  const parties = ['BJP', 'INC', 'AAP', 'Congress', 'Independent'];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const name = `${firstName} ${lastName}`;
  const prefix = [7, 8, 9][Math.floor(Math.random() * 3)];
  const phone = `+91${prefix}${Math.floor(Math.random() * 900000000) + 100000000}`;
  const phoneClean = phone.replace('+', '');
  const randomId = String(Math.floor(Math.random() * 9000000) + 1000000);

  return {
    entity_type: 'lead',
    name,
    data: {
      praja_id: randomId,
      name,
      tasks: [
        { task: 'Sending a Demo', status: 'Yes' },
        { task: 'App Installation', status: 'Yes' },
        { task: 'Create/Update Layout', status: 'Null' },
        { task: 'Layout Feedback', status: 'Null' },
        { task: 'Trial Subscription', status: 'Null' },
        { task: 'Premium Poster/ Video Poster Share', status: 'Null' },
      ],
      lead_score: parseFloat((Math.random() * 65 + 30).toFixed(2)),
      phone_number: phone,
      whatsapp_link: `https://wa.me/${phoneClean}`,
      affiliated_party: parties[Math.floor(Math.random() * parties.length)],
      user_profile_link: `https://www.thecircleapp.in/admin/users/${Math.random().toString(36).substring(7)}`,
      display_pic_url: 'https://a-cdn.thecircleapp.in/capture/01K4QKP9EAD7SBB794NBY1MQ94.png',
    },
  };
}

export const OperationsProgramsComponent: React.FC<OperationsProgramsComponentProps> = ({ config = {} }) => {
  const { session } = useAuth();
  const [apiOperations, setApiOperations] = useState<ApiCallOperation[]>([]);
  const [selectedOp, setSelectedOp] = useState<ApiCallOperation | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // API Call form
  const [formTitle, setFormTitle] = useState('');
  const [formReqType, setFormReqType] = useState<ApiCallOperation['reqType']>('GET');
  const [formEndpoint, setFormEndpoint] = useState('');
  const [formPayload, setFormPayload] = useState('');

  // Push Random Leads
  const [leadEndpoint, setLeadEndpoint] = useState('/crm-records/records/');
  const [leadCount, setLeadCount] = useState(10);
  const [isPushingLeads, setIsPushingLeads] = useState(false);

  const componentTitle = config?.title || 'Operations';

  useEffect(() => {
    try {
      const stored = localStorage.getItem('operations_api_calls');
      if (stored) setApiOperations(JSON.parse(stored));
    } catch {
      setApiOperations([]);
    }
  }, []);

  const saveOperations = (ops: ApiCallOperation[]) => {
    setApiOperations(ops);
    localStorage.setItem('operations_api_calls', JSON.stringify(ops));
  };

  const handleSubmitApiCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formEndpoint.trim()) {
      toast.error('Title and endpoint are required');
      return;
    }
    setIsSubmitting(true);
    const op: ApiCallOperation = {
      id: editingId || `op-${Date.now()}`,
      title: formTitle.trim(),
      reqType: formReqType,
      endpoint: formEndpoint.trim(),
      payload: formPayload?.trim() || undefined,
    };
    let next = apiOperations;
    if (editingId) {
      next = apiOperations.map((o) => (o.id === editingId ? op : o));
      toast.success('Operation updated');
    } else {
      next = [...apiOperations, op];
      toast.success('Operation added');
    }
    saveOperations(next);
    setSelectedOp(op);
    setFormTitle('');
    setFormEndpoint('');
    setFormPayload('');
    setFormReqType('GET');
    setEditingId(null);
    setIsFormOpen(false);
    setIsSubmitting(false);
  };

  const handleEdit = (op: ApiCallOperation) => {
    setFormTitle(op.title);
    setFormEndpoint(op.endpoint);
    setFormPayload(op.payload || '');
    setFormReqType(op.reqType);
    setEditingId(op.id);
    setSelectedOp(op);
    setIsFormOpen(true);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const next = apiOperations.filter((o) => o.id !== deleteId);
    saveOperations(next);
    if (selectedOp?.id === deleteId) setSelectedOp(null);
    toast.success('Operation deleted');
    setDeleteId(null);
  };

  const handleRunApiCall = async (op?: ApiCallOperation | null) => {
    const target = op ?? selectedOp;
    if (!target) return;
    if (!session?.access_token) {
      toast.error('Please log in first');
      return;
    }
    setIsRunning(true);
    try {
      let payload: unknown = null;
      if (target.payload) {
        try {
          payload = JSON.parse(target.payload);
        } catch {
          payload = target.payload;
        }
      }
      await apiClient.request({
        method: target.reqType,
        url: target.endpoint,
        data: payload,
        headers: { 'X-Tenant-Slug': TENANT_ID } as Record<string, string>,
      });
      toast.success('API call completed');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Unknown error';
      toast.error(`API call failed: ${msg}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handlePushRandomLeads = async () => {
    if (!session?.access_token) {
      toast.error('Please log in first');
      return;
    }
    const path = (leadEndpoint.trim() || '/crm-records/records/').replace(/^\/+/, '');
    const endpoint = `/${path}`;
    const count = Math.max(1, Math.min(100, leadCount || 10));
    setIsPushingLeads(true);
    toast.info(`Pushing ${count} random leads...`);
    let success = 0;
    let fail = 0;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'X-Tenant-Slug': TENANT_ID,
    };
    for (let i = 0; i < count; i++) {
      try {
        const payload = generateRandomLead();
        await pushLeadsClient.post(endpoint, payload, { headers: headers as never });
        success++;
        if (i < count - 1) await new Promise((r) => setTimeout(r, 200));
      } catch {
        fail++;
      }
    }
    setIsPushingLeads(false);
    if (success === count) toast.success(`All ${count} leads pushed.`);
    else if (success > 0) toast.warning(`${success} pushed, ${fail} failed.`);
    else toast.error('All requests failed.');
  };

  const openAddForm = () => {
    setFormTitle('');
    setFormEndpoint('');
    setFormPayload('');
    setFormReqType('GET');
    setEditingId(null);
    setSelectedOp(null);
    setIsFormOpen(true);
  };

  return (
    <div className="w-full h-full flex gap-6 p-4">
      {/* 1. Add API Call Operation */}
      <Card className="w-full max-w-md flex-shrink-0">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Play className="h-5 w-5" />
            API Call Operation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isFormOpen ? (
            <>
              <CustomButton onClick={openAddForm} icon={<Plus className="h-4 w-4" />} className="w-full bg-black text-white hover:bg-gray-800">
                Add API Call
              </CustomButton>
              {apiOperations.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Saved operations</Label>
                  {apiOperations.map((op) => (
                    <div
                      key={op.id}
                      onClick={() => setSelectedOp(op)}
                      className={`p-3 rounded border cursor-pointer text-sm ${selectedOp?.id === op.id ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="font-medium">{op.title}</div>
                      <div className="text-xs text-gray-500">{op.reqType} • {op.endpoint}</div>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleEdit(op); }}>Edit</Button>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={(e) => { e.stopPropagation(); setDeleteId(op.id); }}>Delete</Button>
                        <Button size="sm" className="bg-black text-white hover:bg-gray-800" onClick={(e) => { e.stopPropagation(); handleRunApiCall(op); }} disabled={isRunning}>Run</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSubmitApiCall} className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="My API call" required />
              </div>
              <div>
                <Label>Method</Label>
                <Select value={formReqType} onValueChange={(v) => setFormReqType(v as ApiCallOperation['reqType'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Endpoint</Label>
                <Input value={formEndpoint} onChange={(e) => setFormEndpoint(e.target.value)} placeholder="/crm-records/records/" required />
              </div>
              {formReqType !== 'GET' && (
                <div>
                  <Label>Payload (JSON, optional)</Label>
                  <Textarea value={formPayload} onChange={(e) => setFormPayload(e.target.value)} placeholder='{"key": "value"}' rows={3} className="font-mono text-sm" />
                </div>
              )}
              <div className="flex gap-2">
                <CustomButton type="submit" disabled={isSubmitting} loading={isSubmitting} className="bg-black text-white hover:bg-gray-800">Save</CustomButton>
                <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); setEditingId(null); }}>Cancel</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* 2. Push Random Leads */}
      <Card className="w-full max-w-md flex-shrink-0">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Push Random Leads
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Endpoint path</Label>
            <Input value={leadEndpoint} onChange={(e) => setLeadEndpoint(e.target.value)} placeholder="/crm-records/records/" />
            <p className="text-xs text-gray-500 mt-1">Base URL: {PUSH_LEADS_API_PREFIX}</p>
          </div>
          <div>
            <Label>Number of leads</Label>
            <Input type="number" min={1} max={100} value={leadCount} onChange={(e) => setLeadCount(parseInt(e.target.value, 10) || 10)} />
          </div>
          <CustomButton
            onClick={handlePushRandomLeads}
            disabled={isPushingLeads || !session?.access_token}
            loading={isPushingLeads}
            icon={<Zap className="h-4 w-4" />}
            className="w-full bg-black text-white hover:bg-gray-800"
          >
            {isPushingLeads ? 'Pushing...' : 'Push Random Leads'}
          </CustomButton>
          <p className="text-xs text-gray-500">Sends random lead data (name, phone, party, score, etc.) to the endpoint. Uses your session token.</p>
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete operation?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OperationsProgramsComponent;
