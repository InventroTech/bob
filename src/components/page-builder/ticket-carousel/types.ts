/** Types for the ticket carousel module. */

export interface Ticket {
  id: number;
  created_at: string;
  dumped_at: string;
  user_id: string;
  name: string;
  phone: string;
  source: string;
  subscription_status: string | null;
  atleast_paid_once: boolean | null;
  has_given_referral?: boolean | null;
  reason: string;
  other_reasons: string[] | string | null;
  badge: string | null;
  poster?: string | null;
  support_ticket_type?: string | null;
  Jatra_link?: string | null;
  tenant_id: string;
  assigned_to: string | null;
  layout_status: string;
  state?: string | null;
  tasks?: Array<{ task?: string; title?: string; status?: string; id?: string }>;
  task_progress?: Array<{ id: string; label: string; status: "completed" | "current" | "pending" }>;
  record_id?: number;
  support_ticket_id?: number;
  resolution_status: "Resolved" | "WIP" | "Pending" | "Already Resolved" | "No Issue" | "Not Possible" | "Feature Requested" | "Can't Resolve";
  resolution_time: string | null;
  cse_name: string | null;
  cse_remarks: string | null;
  call_status: string | null;
  call_attempts: number | null;
  rm_name: string | null;
  completed_at: string | null;
  snooze_until: string | null;
  praja_dashboard_user_link: string | null;
  display_pic_url: string | null;
  user_input?: string | null;
}

export type TicketTaskProgressStep = {
  id: string;
  label: string;
  status: "completed" | "current" | "pending";
};

export interface TicketCarouselProps {
  config?: {
    apiEndpoint?: string;
    statusDataApiEndpoint?: string;
    apiPrefix?: 'supabase' | 'renderer';
    title?: string;
    whatsappTemplatesApiEndpoint?: string;
  };
  initialTicket?: any;
  onUpdate?: (updatedTicket: any) => void;
  isInModal?: boolean;
}
