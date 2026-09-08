/** Pure helpers for the lead card carousel module. */

import type { LeadData } from './types';

/** Format CRM recall timestamp for the pending-dashboard cards */
export function formatRecallAtLabel(iso: string | null): string {
  if (!iso) return 'No recall time set';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export const parseTags = (tags: string[] | string) => {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") return tags.split(",").map(tag => tag.trim());
  return [];
};

/** Resolve CRM record primary key for GET-by-id and realtime matching. */
export function resolveLeadRecordId(
  lead: { id?: unknown; record_id?: unknown } | null | undefined,
): number | null {
  if (!lead) return null;
  for (const candidate of [lead.record_id, lead.id]) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function tasksSignature(tasks: unknown): string {
  try {
    return JSON.stringify(tasks ?? null);
  } catch {
    return String(tasks);
  }
}

/** Normalize API lead response to LeadData shape (for fresh fetch when card opened from table) */
export const normalizeApiLeadToLeadData = (apiLead: any): LeadData => {
  const d = apiLead?.data || {};
  const recordId = resolveLeadRecordId(apiLead) ?? apiLead?.id;
  return {
    id: recordId,
    created_at: apiLead.created_at ?? '',
    name: apiLead.name ?? d.name ?? 'N/A',
    email: apiLead.email ?? d.email ?? '',
    phone: apiLead.phone ?? apiLead.phone_number ?? d.phone_number ?? d.phone_no ?? d.phone ?? '',
    phone_no: apiLead.phone_no ?? apiLead.phone_number ?? d.phone_number ?? d.phone_no ?? d.phone ?? '',
    phone_number: apiLead.phone_number ?? d.phone_number ?? d.phone_no ?? d.phone ?? '',
    company: apiLead.company ?? d.company ?? '',
    position: apiLead.position ?? d.position ?? '',
    source: apiLead.source ?? d.lead_source ?? d.source ?? '',
    lead_source: apiLead.lead_source ?? d.lead_source ?? '',
    status: apiLead.status ?? apiLead.lead_stage ?? d.lead_stage ?? d.lead_status ?? 'New',
    notes: apiLead.notes ?? d.notes ?? d.latest_remarks ?? '',
    budget: apiLead.budget ?? d.budget ?? 0,
    location: apiLead.location ?? d.location ?? d.state ?? '',
    tags: Array.isArray(apiLead.tags) ? apiLead.tags : (d.tags ? (Array.isArray(d.tags) ? d.tags : []) : []),
    display_pic_url: apiLead.display_pic_url ?? d.display_pic_url ?? null,
    linkedin_profile: apiLead.linkedin_profile ?? d.linkedin_profile ?? '',
    website: apiLead.website ?? d.website ?? '',
    next_follow_up: apiLead.next_follow_up ?? d.next_follow_up ?? d.next_call_at ?? '',
    lead_stage: apiLead.lead_stage ?? d.lead_stage ?? d.lead_status ?? 'New',
    praja_id: apiLead.praja_id ?? d.praja_id ?? d.user_id ?? '',
    affiliated_party: apiLead.affiliated_party ?? d.affiliated_party ?? '',
    rm_dashboard: apiLead.rm_dashboard ?? d.rm_dashboard ?? '',
    user_profile_link: apiLead.user_profile_link ?? d.user_profile_link ?? '',
    whatsapp_link: apiLead.whatsapp_link ?? d.whatsapp_link ?? '',
    package_to_pitch: apiLead.package_to_pitch ?? d.package_to_pitch ?? '',
    premium_poster_count: apiLead.premium_poster_count ?? d.premium_poster_count ?? 0,
    last_active_date: apiLead.last_active_date ?? d.last_active_date ?? '',
    last_active_date_time: apiLead.last_active_date_time ?? d.last_active_date_time ?? '',
    latest_remarks: apiLead.latest_remarks ?? d.latest_remarks ?? '',
    tasks: apiLead.tasks ?? d.tasks ?? [],
    data: {
      ...d,
      name: d.name ?? apiLead.name ?? 'N/A',
      phone_number: d.phone_number ?? apiLead.phone_number ?? '',
      lead_stage: d.lead_stage ?? apiLead.lead_stage ?? 'New',
      praja_id: d.praja_id ?? apiLead.praja_id ?? '',
      tasks: apiLead.tasks ?? d.tasks,
    },
  };
};

export const persistActionButtonsState = (leadId: string | number | undefined, visible: boolean) => {
  try {
    if (leadId && visible) {
      sessionStorage.setItem('leadCardCarousel_actionButtonsVisible', JSON.stringify({ leadId: String(leadId), visible }));
    } else {
      sessionStorage.removeItem('leadCardCarousel_actionButtonsVisible');
    }
  } catch (e) {
    console.warn('[LeadCardCarousel] Failed to persist action buttons state:', e);
  }
};

export const restoreActionButtonsState = (leadId: string | number | undefined): boolean => {
  try {
    if (!leadId) return false;
    const stored = sessionStorage.getItem('leadCardCarousel_actionButtonsVisible');
    if (stored) {
      const { leadId: storedLeadId, visible } = JSON.parse(stored);
      if (String(storedLeadId) === String(leadId) && visible) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};

export const getTodayDateString = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

export const shouldResetFetchedCount = (): boolean => {
  try {
    const lastResetDate = localStorage.getItem('leadCardCarousel_lastResetDate');
    const today = getTodayDateString();
    return lastResetDate !== today;
  } catch {
    return true;
  }
};

export const getLeadName = (lead: LeadData | null): string => {
  if (!lead) return "N/A";
  return lead.data?.name || lead.name || "N/A";
};

/** Display and copy: digits only, no spaces. Indian 91+10 digits shown as 10 digits. */
export const formatPhoneForDisplay = (phone?: string) => {
  if (!phone) return "N/A";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "N/A";
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  return digits;
};

export const normalizePhoneForLinks = (phone?: string) => {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
};

/** For tel: link strip leading 91 so dialer gets 10-digit number */
export const getPhoneForDial = (phone?: string) => {
  const digits = normalizePhoneForLinks(phone);
  if (!digits) return "";
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  return digits;
};
