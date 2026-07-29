/** Pure helpers and constants for the ticket table module. */

import type { Column } from './types';

export const TICKET_API_BASE = import.meta.env.VITE_RENDER_API_URL;

export function transformTicketForCarousel(row: any) {
  const nestedData =
    row?.data && typeof row.data === "object" && !Array.isArray(row.data) ? row.data : null;
  const userInput =
    row.user_input ??
    row.userInput ??
    nestedData?.user_input ??
    nestedData?.userInput ??
    null;

  return {
    ...row,
    id: row.record_id ?? row.id ?? row.support_ticket_id,
    record_id: row.record_id ?? row.id ?? row.support_ticket_id,
    support_ticket_id: row.support_ticket_id ?? row.id,
    support_ticket_type: row.support_ticket_type ?? row.poster ?? null,
    phone: row.phone ?? row.phone_number ?? row.mobile ?? "",
    poster: row.poster && row.poster !== "No Poster" ? row.poster : row.support_ticket_type ?? row.poster,
    resolution_status:
      row.resolution_status === "Open" ? "Pending" : row.resolution_status,
    ...(userInput ? { user_input: userInput } : {}),
  };
}

// Status color mapping - matching design colors
export const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'paid':
    case 'active':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'auto pay not set':
    case 'autopay_setup_no_layout':
    case 'auto_pay_not_set_up':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'in trial':
    case 'in_trial':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'trial expired':
    case 'trial_expired':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'open':
    case 'pending':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'in progress':
    case 'wip':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'resolved':
    case 'completed':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'closed':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    case 'cancelled':
    case 'failed':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'not paid':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

// Function to convert email to display name
export const getDisplayName = (email: string | null): string => {
  if (!email) return 'Unassigned';
  
  // If it's already a name (not an email), return as is
  if (!email.includes('@')) return email;
  
  // Extract name from email
  const namePart = email.split('@')[0];
  
  // Convert to title case and replace dots/underscores with spaces
  const displayName = namePart
    .replace(/[._]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return displayName;
};

// Function to format relative time
// Using formatRelativeTimeIST from timeUtils for consistent GMT to IST conversion

// Function to format poster status with better UI
export const formatPosterStatus = (poster: string): { label: string; color: string; bgColor: string } => {
  switch (poster) {
    case 'in_trial':
      return { label: 'In Trial', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    case 'paid':
      return { label: 'Paid', color: 'text-green-600', bgColor: 'bg-green-50' };
    case 'in_trial_extension':
      return { label: 'Trial Extended', color: 'text-purple-600', bgColor: 'bg-purple-50' };
    case 'in_premium_extension':
      return { label: 'Premium Extended', color: 'text-indigo-600', bgColor: 'bg-indigo-50' };
    case 'trial_expired':
      return { label: 'Trial Expired', color: 'text-red-600', bgColor: 'bg-red-50' };
    case 'in_grace_period':
      return { label: 'Grace Period', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    case 'auto_pay_not_set_up':
      return { label: 'Auto-pay Not Set', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    case 'autopay_setup_no_layout':
      return { label: 'Auto-pay No Layout', color: 'text-amber-600', bgColor: 'bg-amber-50' };
    case 'free':
      return { label: 'Free', color: 'text-gray-600', bgColor: 'bg-gray-50' };
    default:
      return { label: poster || 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-50' };
  }
};

export const SUPPORT_TICKET_STATE_FILTER_OPTIONS: (string | null)[] = [
  'Andhra Pradesh',
  'Karnataka',
  'Tamil Nadu',
  'Telangana',
  null,
];
export const SUPPORT_TICKET_CALL_ATTEMPT_FILTER_OPTIONS: number[] = [0, 1, 2, 3, 4, 5, 6];

// Demo data for fallback
export const DEMO_TICKETS = [
  {
    id: "23",
    first_name: "Rahul",
    last_name: "Sharma",
    phone_number: "+91 9876543210",
    email_id: "rahul.sharma@example.com",
    praja_user_id: "PRAJA001",
    ticket_type: "Support",
    actual_ticket_type: ["Billing_cancellation"],
    created_at: "2024-03-15T10:30:00",
    assigned_to: "CSE001",
    resolution_status: "Open",
    reason: "Need help with billing cancellation",
    Description: "Need help with billing cancellation",
    subscription_status: true,
    cse_name: "CSE001"
  },
  {
    id: "24",
    first_name: "Priya",
    last_name: "Patel",
    phone_number: "+91 8765432109",
    email_id: "priya.patel@example.com",
    praja_user_id: "PRAJA002",
    ticket_type: "Support",
    actual_ticket_type: ["poster_update"],
    created_at: "2024-03-15T11:45:00",
    assigned_to: "CSE002",
    resolution_status: "In Progress",
    reason: "Update poster design",
    Description: "Update poster design",
    subscription_status: false,
    cse_name: "CSE002"
  },
  {
    id: "25",
    first_name: "Amit",
    last_name: "Kumar",
    phone_number: "+91 7654321098",
    email_id: "amit.kumar@example.com",
    praja_user_id: "PRAJA003",
    ticket_type: "Support",
    actual_ticket_type: ["badge_requested"],
    created_at: "2024-03-15T09:15:00",
    assigned_to: "CSE003",
    resolution_status: "Resolved",
    reason: "Request for new badge",
    Description: "Request for new badge",
    subscription_status: true,
    cse_name: "CSE003"
  },
  {
    id: "26",
    first_name: "Sneha",
    last_name: "Gupta",
    phone_number: "+91 6543210987",
    email_id: "sneha.gupta@example.com",
    praja_user_id: "PRAJA004",
    ticket_type: "Support",
    actual_ticket_type: ["Others"],
    created_at: "2024-03-15T14:20:00",
    assigned_to: "CSE004",
    resolution_status: "Pending",
    reason: "General inquiry about services",
    Description: "General inquiry about services",
    subscription_status: false,
    cse_name: "CSE004"
  }
];

// Default columns if no configuration is provided
export const defaultColumns: Column[] = [
  { header: 'Name', accessor: 'name', type: 'text' },
  { header: 'Praja User Id', accessor: 'user_id', type: 'link' },
  { header: 'Created At', accessor: 'created_at', type: 'text' },
  { header: 'Assigned To', accessor: 'cse_name', type: 'text' },
  { header: 'Reason', accessor: 'reason', type: 'text' },
  { header: 'Poster Status', accessor: 'poster', type: 'chip' },
  { header: 'Resolution Status', accessor: 'resolution_status', type: 'chip' },
  { header: 'Remarks', accessor: 'cse_remarks', type: 'text' }
];

