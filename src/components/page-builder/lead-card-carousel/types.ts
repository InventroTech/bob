/** Types for the lead card carousel module. */

export interface LeadCardCarouselHandle {
  handleTrialActivated: () => void;
  handleNotInterestedClick: () => void;
  handleCallNotConnected: () => void;
  handleCallBackLaterClick: () => void;
  updating: boolean;
  currentLead: LeadData | null;
  actionButtonsVisible: boolean;
}

export interface LeadCardCarouselProps {
  config?: {
    title?: string;
    apiEndpoint?: string;
    leadAssignmentWebhookUrl?: string;
    whatsappTemplatesApiEndpoint?: string;
    statusDataApiEndpoint?: string;
    apiPrefix?: 'supabase' | 'renderer';
  };
  initialLead?: LeadData | null;
  onLeadUpdate?: (updatedLead: LeadData | null) => void;
  isInModal?: boolean;
  hideActionBar?: boolean;
  onActionButtonsVisibilityChange?: (visible: boolean) => void;
  onCallBackModalChange?: (open: boolean) => void;
  onActionComplete?: (leadId: number | string, action?: string) => void;
}

export interface LeadTask {
  id?: string | number;
  title?: string;
  name?: string;
  description?: string;
  status?: string;
  due_date?: string;
  dueDate?: string;
  rawStatus?: any;
  [key: string]: any;
}

export interface LeadData {
  id: number;
  created_at: string;
  name: string;
  email: string;
  phone?: string;
  phone_no?: string;
  phone_number?: string;
  company: string;
  position: string;
  source?: string;
  lead_source?: string;
  lead_source_description?: string;
  status: string;
  notes: string;
  budget: number;
  location: string;
  tags: string[];
  display_pic_url?: string | null;
  linkedin_profile: string;
  website: string;
  next_follow_up: string;
  lead_stage: string;
  praja_id: string;
  affiliated_party: string;
  rm_dashboard: string;
  user_profile_link: string;
  whatsapp_link: string;
  package_to_pitch: string;
  premium_poster_count: number;
  last_active_date?: string;
  last_active_date_time?: string;
  latest_remarks: string;
  tasks?: LeadTask[] | LeadTask | string;
  data?: {
    notes?: string;
    tasks?: LeadTask[] | LeadTask | string;
    [key: string]: any;
  };
}

export interface LeadState {
  leadStatus: string;
  notes: string;
  selectedTags: string[];
  nextFollowUp: string;
  leadStartTime: Date;
}

export interface TaskStep {
  id: string;
  label: string;
  description?: string;
  status: "completed" | "current" | "pending";
}

export interface PendingDashState {
  notConnected: { name: string; nextCallLabel: string } | null;
  snoozed: { name: string; nextCallLabel: string } | null;
  trialAcceptedToday: number;
  notInterestedToday: number;
  loading: boolean;
}

export interface GroupFreshLeadsState {
  name: string;
  count: number | null;
  loaded: boolean;
}
