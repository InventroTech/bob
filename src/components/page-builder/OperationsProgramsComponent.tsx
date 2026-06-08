import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomButton } from '@/components/ui/CustomButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Play, Plus, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
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
const PUSH_API_PREFIX = (
  import.meta.env.VITE_RENDER_API_URL || 'https://pyro-backend-1.onrender.com'
).replace(/\/+$/, '');
const WEBHOOK_SECRET = import.meta.env.VITE_WEBHOOK_SECRET || '';
const pushRecordsClient = createApiClient(PUSH_API_PREFIX);

type PushEntityType = 'lead' | 'support_ticket';

const DEFAULT_ENDPOINTS: Record<PushEntityType, string> = {
  lead: 'crm-records/records/',
  support_ticket: 'support-ticket/dump-ticket-webhook/',
};

const PUSH_ENTITY_LABELS: Record<PushEntityType, string> = {
  lead: 'Lead',
  support_ticket: 'Support Ticket',
};

export interface ApiCallOperation {
  id: string;
  title: string;
  reqType: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  payload?: string;
}

interface OperationsProgramsComponentProps {
  config?: {
    title?: string;
    defaultEndpoint?: string;
    defaultLeadEndpoint?: string;
    defaultSupportTicketEndpoint?: string;
  };
}

const FIRST_NAMES = ['Rajagopalam', 'Anand', 'Sanjay', 'Meena', 'Priya', 'Vikram', 'Quincy', 'Chaitanya', 'Udyati', 'Vedika', 'Jack', 'Rahul', 'Sneha', 'Arjun', 'Kavya', 'Samba sivarao'];
const LAST_NAMES = ['Pinninti', 'Reddy', 'Sharma', 'Kaur', 'Jain', 'Verma', 'Khatri', 'Chhabra', 'Bedi', 'Mitra', 'Mahajan', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Gandrala'];

function randomIndianPhone(): string {
  const prefix = [7, 8, 9][Math.floor(Math.random() * 3)];
  return `+91${prefix}${Math.floor(Math.random() * 900000000) + 100000000}`;
}

function randomName(): string {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${firstName} ${lastName}`;
}

// Generate one random lead payload
function generateRandomLead(): Record<string, unknown> {
  const parties = ['BJP', 'INC', 'AAP', 'Congress', 'Independent'];
  const leadSources = [
    'APP_INSTALL_SINGLE_PARTY_JOINED_BJP_TG', 'MANUAL', 'APP_INSTALL_SINGLE_LEADER_CIRCLE_JOINED_YSRCP',
    'MANUAL_HIGH_END_DEVICE', 'APP_UNINSTALL_SINGLE_PARTY_JOINED_YSRCP', 'APP_INSTALL_ML_PB',
    'APP_INSTALL_SINGLE_LEADER_CIRCLE_JOINED_INC_TG', 'APP_INSTALL_SINGLE_PARTY_JOINED_JSP',
    'SELF_TRIAL_DROPPED_LEADER_POSTER_SHARE', 'LEADER_PROFESSION', 'APP_UNINSTALL_POLITICAL_SUPER_SET',
    'APP_INSTALL_SINGLE_PARTY_JOINED_BJP_AP', 'WATI_DEMO_PITCH', 'APP_INSTALL_SINGLE_PARTY_JOINED_TDP',
    'APP_UNINSTALL_SINGLE_PARTY_JOINED_INC_TG', 'SELF_TRIAL_DROPPED_GENERIC_USER', 'OLD_LEAD',
    'APP_UNINSTALL_SINGLE_PARTY_JOINED_JSP', 'UNKNOWN', 'APP_INSTALL_POLITICAL_SUPER_SET',
    'LEADER_POSTER_SHARE', 'APP_UNINSTALL_SINGLE_PARTY_JOINED_INC_AP', 'APP_INSTALL_SINGLE_PARTY_JOINED_INC_AP',
    'APP_UNINSTALL_SINGLE_PARTY_JOINED_BJP_AP', 'HIGH_END_DEVICE', 'NO_LAYOUT_CUST_SUPPORT',
    'HIGH_END_DEVICE_NON_LEADER', 'SIGNUP_AT_SINGLE_PARTY', 'APP_INSTALL_SINGLE_PARTY_JOINED_BRS',
    'SELF_TRIAL', 'SELF_TRIAL_DROPPED_HIGH_END_DEVICE_NON_LEADER', 'APP_UNINSTALL_ML_PB',
    'PREMIUM_REFERRAL', 'SELF_TRIAL_DROPPED_LEADER_PROFESSION', 'REFERRAL_TO_RM',
    'APP_UNINSTALL_SINGLE_PARTY_JOINED_BJP_TG', 'APP_UNINSTALL_SINGLE_PARTY_JOINED_BRS',
    'APP_UNINSTALL_SINGLE_PARTY_JOINED_TDP', 'SIGNUP_AT_SINGLE_PARTY_HIGH_END_DEVICE',
    'AGENT_PARTNER', 'SELF_TRIAL_DROPPED_SIGNUP_AT_SINGLE_PARTY', 'APP_INSTALL_SINGLE_PARTY_JOINED_INC_TG',
    'SELF_TRIAL_DROPPED_AT_FINAL_STEP', 'APP_INSTALL_SINGLE_PARTY_JOINED_YSRCP', 'SELF_TRIAL_DROPPED_HIGH_END_DEVICE'
  ];
  const leadStatuses = ['SALES LEAD', 'SELF TRIAL'];
  const name = randomName();
  const states = ['Telangana', 'Andhra Pradesh', 'Tamil Nadu'];
  const phone = randomIndianPhone();
  const phoneClean = phone.replace('+', '');
  const randomId = String(Math.floor(Math.random() * 9000000) + 1000000);

  return {
    entity_type: 'lead',
    name,
    data: {
      praja_id: randomId,
      name,
      state: states[Math.floor(Math.random() * states.length)],
      tasks: [
        { task: 'Sending a Demo', status: 'Yes' },
        { task: 'App Installation', status: 'Yes' },
        { task: 'Create/Update Layout', status: 'Null' },
        { task: 'Layout Feedback', status: 'Null' },
        { task: 'Trial Subscription', status: 'Null' },
        { task: 'Premium Poster/ Video Poster Share', status: 'Null' },
      ],
      lead_score: parseFloat((Math.random() * 65 + 30).toFixed(2)),
      lead_source: leadSources[Math.floor(Math.random() * leadSources.length)],
      lead_status: leadStatuses[Math.floor(Math.random() * leadStatuses.length)],
      phone_number: phone,
      whatsapp_link: `https://wa.me/${phoneClean}`,
      affiliated_party: parties[Math.floor(Math.random() * parties.length)],
      user_profile_link: `https://www.thecircleapp.in/admin/users/${Math.random().toString(36).substring(7)}`,
      display_pic_url: 'https://a-cdn.thecircleapp.in/capture/01K4QKP9EAD7SBB794NBY1MQ94.png',
    },
  };
}

/** Fields accepted by DumpTicketWebhookView (support_ticket_dump table). */
function generateRandomSupportTicket(tenantId: string): Record<string, unknown> {
  const ticketDate = new Date().toISOString();
  const name = randomName();
  const phone = randomIndianPhone();
  const userId = String(Math.floor(Math.random() * 9000000) + 1000000);
  const prajaUserSlug = Math.random().toString(36).substring(2, 10);

  const states = ['Andhra Pradesh', 'Karnataka', 'Tamil Nadu', 'Telangana'];
  const posters = ['paid', 'in_trial', 'trial_expired', 'free', 'in_grace_period', 'autopay_setup_no_layout'];
  const reasons = ['Others', 'Badge Change', 'Feature Request', 'Refund Issued', 'Subscription Information', 'Layout Feedback'];
  const sources = ['Drawer', 'Webhook', 'Manual', 'App'];
  const layoutStatuses = ['Layout created', 'No Layout', 'Layout Pending'];
  const subscriptionStatuses = ['Paid', 'In Trial', 'Trial Expired', 'Not Paid'];

  return {
    tenant_id: tenantId,
    ticket_date: ticketDate,
    user_id: userId,
    name,
    phone,
    reason: reasons[Math.floor(Math.random() * reasons.length)],
    layout_status: layoutStatuses[Math.floor(Math.random() * layoutStatuses.length)],
    state: states[Math.floor(Math.random() * states.length)],
    badge: '',
    poster: posters[Math.floor(Math.random() * posters.length)],
    subscription_status: subscriptionStatuses[Math.floor(Math.random() * subscriptionStatuses.length)],
    atleast_paid_once: Math.random() > 0.3,
    source: sources[Math.floor(Math.random() * sources.length)],
    praja_dashboard_user_link: `https://www.thecircleapp.in/admin/users/${prajaUserSlug}`,
    display_pic_url: 'https://a-cdn.thecircleapp.in/cutouts-originals-nckpt/01KPSMY018EKY4P5PJP5V8AWHG.jpg',
  };
}

export const OperationsProgramsComponent: React.FC<OperationsProgramsComponentProps> = ({ config = {} }) => {
  const { session } = useAuth();
  const { tenantId } = useTenant();
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

  // Push random records (leads or support tickets)
  const [pushEntityType, setPushEntityType] = useState<PushEntityType>('lead');
  const [pushEndpoints, setPushEndpoints] = useState<Record<PushEntityType, string>>({
    lead: config?.defaultLeadEndpoint || config?.defaultEndpoint || '',
    support_ticket: config?.defaultSupportTicketEndpoint || '',
  });
  const [pushCount, setPushCount] = useState(10);
  const [isPushing, setIsPushing] = useState(false);

  const componentTitle = config?.title || 'Operations';
  const effectiveTenantId = tenantId || TENANT_ID;
  const pushEndpoint = pushEndpoints[pushEntityType];
  const defaultPushEndpoint =
    pushEntityType === 'lead'
      ? (config?.defaultLeadEndpoint || config?.defaultEndpoint || DEFAULT_ENDPOINTS.lead)
      : (config?.defaultSupportTicketEndpoint || DEFAULT_ENDPOINTS.support_ticket);

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

  const handlePushRandomRecords = async () => {
    if (pushEntityType === 'lead' && !session?.access_token) {
      toast.error('Please log in first');
      return;
    }
    if (pushEntityType === 'support_ticket' && !WEBHOOK_SECRET) {
      toast.error('Set VITE_WEBHOOK_SECRET in .env (must match backend WEBHOOK_SECRET)');
      return;
    }
    const path = (pushEndpoint.trim() || defaultPushEndpoint).replace(/^\/+/, '');
    if (!path) {
      toast.error('Endpoint path is required');
      return;
    }
    const endpoint = `/${path}`;
    const count = Math.max(1, Math.min(100, pushCount || 10));
    const entityLabel = PUSH_ENTITY_LABELS[pushEntityType].toLowerCase();
    setIsPushing(true);
    toast.info(`Pushing ${count} random ${entityLabel}s...`);
    let success = 0;
    let fail = 0;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (pushEntityType === 'lead') {
      headers.Authorization = `Bearer ${session!.access_token}`;
      headers['X-Tenant-Slug'] = effectiveTenantId;
      headers['X-Secret-Pyro'] = 'test';
    } else {
      headers['x-webhook-secret'] = WEBHOOK_SECRET;
    }

    for (let i = 0; i < count; i++) {
      try {
        const payload =
          pushEntityType === 'lead'
            ? generateRandomLead()
            : generateRandomSupportTicket(effectiveTenantId);
        await pushRecordsClient.post(endpoint, payload, { headers: headers as never });
        success++;
        if (i < count - 1) await new Promise((r) => setTimeout(r, 200));
      } catch {
        fail++;
      }
    }
    setIsPushing(false);
    if (success === count) toast.success(`All ${count} ${entityLabel}s pushed.`);
    else if (success > 0) toast.warning(`${success} pushed, ${fail} failed.`);
    else toast.error('All requests failed.');
  };

  const canPushRecords =
    pushEntityType === 'lead'
      ? Boolean(session?.access_token)
      : Boolean(WEBHOOK_SECRET);

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

      {/* 2. Push Random Records */}
      <Card className="w-full max-w-md flex-shrink-0">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Push Random Records
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Record type</Label>
            <Select
              value={pushEntityType}
              onValueChange={(value) => setPushEntityType(value as PushEntityType)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="support_ticket">Support Ticket (dump table)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Endpoint path</Label>
            <Input
              value={pushEndpoint}
              onChange={(e) =>
                setPushEndpoints((prev) => ({ ...prev, [pushEntityType]: e.target.value }))
              }
              placeholder={defaultPushEndpoint}
            />
            <p className="text-xs text-gray-500 mt-1">Base URL: {PUSH_API_PREFIX}</p>
          </div>
          <div>
            <Label>Number of records</Label>
            <Input type="number" min={1} max={100} value={pushCount} onChange={(e) => setPushCount(parseInt(e.target.value, 10) || 10)} />
          </div>
          <CustomButton
            onClick={handlePushRandomRecords}
            disabled={isPushing || !canPushRecords}
            loading={isPushing}
            icon={<Zap className="h-4 w-4" />}
            className="w-full bg-black text-white hover:bg-gray-800"
          >
            {isPushing
              ? 'Pushing...'
              : `Push Random ${PUSH_ENTITY_LABELS[pushEntityType]}s`}
          </CustomButton>
          <p className="text-xs text-gray-500">
            {pushEntityType === 'lead'
              ? 'Sends random lead data to crm-records. Uses your session token and X-Secret-Pyro.'
              : 'Sends random rows to support_ticket_dump via dump-ticket-webhook. Uses VITE_WEBHOOK_SECRET from .env.'}
          </p>
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
