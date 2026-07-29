/** Constants and helpers for the ticket carousel. */

import type { Ticket, TicketTaskProgressStep } from './types';

export const OTHER_REASONS_OPTIONS = [
  "Add Additional Badge",
  "Autopay Cancellation",
  "Autopay Cancellation Confirmation",
  "Badge Change",
  "Badge Removal",
  "Badge Request",
  "Feature Request",
  "Features Information",
  "Frame Change",
  "Location Change",
  "New Poster Request",
  "No Issue",
  "Number Update",
  "Partial Refund",
  "Protocol Change",
  "Refund Issued",
  "Refund Not Issued",
  "Subscription Information",
  "Update Affiliated Party",
  "User Name Update",
  "User Photo Background Change",
  "User Photo Change",
  "User photo/Protocol Size Issue",
  "Self Trial Completion",
];

/** Normalize legacy misspellings so saved values still match the option list. */
export const OTHER_REASONS_ALIASES: Record<string, string> = {
  "Protocal Change": "Protocol Change",
  "User photo/Protocal Size Issue": "User photo/Protocol Size Issue",
};

export const normalizeOtherReason = (reason: string): string =>
  OTHER_REASONS_ALIASES[reason] ?? reason;

export const parseOtherReasons = (otherReasons: any): string[] => {
  let reasons: string[] = [];
  if (!otherReasons) return [];
  if (Array.isArray(otherReasons)) {
    reasons = otherReasons;
  } else if (typeof otherReasons === "string") {
    try {
      const parsed = JSON.parse(otherReasons);
      reasons = Array.isArray(parsed) ? parsed : [];
    } catch {
      reasons = otherReasons.split(",").map((r: string) => r.trim()).filter(Boolean);
    }
  }
  return reasons.map((reason) =>
    typeof reason === "string" ? normalizeOtherReason(reason) : reason
  );
};

// Function to format phone number
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return "N/A";
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a valid Indian mobile number (10 digits starting with 6-9)
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    return `+91 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  
  // Check if it already has country code (12 digits starting with 91)
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  
  // If it doesn't match expected formats, return as is
  return phone;
};

// Function to get clean phone number for links
export const getCleanPhoneNumber = (phone: string): string => {
  if (!phone) return "";
  return phone.replace(/\D/g, '');
};


export const getPhoneDialLink = (phone: string): string => {
  const cleaned = getCleanPhoneNumber(phone);
  if (!cleaned) return "";
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    return `tel:+91${cleaned}`;
  }
  if (cleaned.startsWith("91") && cleaned.length >= 12) {
    return `tel:+${cleaned}`;
  }
  return `tel:+${cleaned}`;
};

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
    case 'premium_expired':
      return { label: 'Premium Expired', color: 'text-red-600', bgColor: 'bg-red-50' };
    case 'in_grace_period':
      return { label: 'Grace Period', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    case 'auto_pay_not_set_up':
      return { label: 'Auto-pay Not Set', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    case 'autopay_setup_no_layout':
      return { label: 'Auto-pay No Layout', color: 'text-amber-600', bgColor: 'bg-amber-50' };
    case 'free':
      return { label: 'Free', color: 'text-gray-600', bgColor: 'bg-gray-50' };
    case 'Self_Trial':
      return { label: 'Self Trial', color: 'text-cyan-600', bgColor: 'bg-cyan-50' };
    default:
      return { label: poster || 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-50' };
  }
};

export function getSupportTicketType(ticket: Ticket | null | undefined): string | null {
  return ticket?.support_ticket_type ?? ticket?.poster ?? null;
}

export function getHasGivenReferral(ticket: Ticket | null | undefined): boolean | null {
  if (!ticket) return null;
  const flat = flattenTicketFields(ticket);
  const value = flat.has_given_referral ?? flat.hasGivenReferral;
  if (value === null || value === undefined) return null;
  return Boolean(value);
}

export function flattenTicketFields(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;

  let current: Record<string, unknown> = { ...raw };
  for (let depth = 0; depth < 3; depth++) {
    const nested = current.data;
    if (!nested || typeof nested !== "object" || Array.isArray(nested)) break;
    const { data: _drop, ...rest } = current;
    current = { ...(nested as Record<string, unknown>), ...rest };
  }
  return current;
}

export function getJatraLink(ticket: Ticket | null | undefined): string | null {
  if (!ticket) return null;
  const flat = flattenTicketFields(ticket);
  const candidates = [flat.Jatra_link, flat.jatra_link, flat.jatraLink];
  for (const link of candidates) {
    if (typeof link === "string" && link.trim()) {
      return link.trim();
    }
  }
  return null;
}

export function getWhatsappLink(ticket: Ticket | null | undefined): string | undefined {
  if (!ticket) return undefined;
  const flat = flattenTicketFields(ticket);
  const link = flat.whatsapp_link;
  if (typeof link === "string" && link.trim()) {
    return link.trim();
  }
  return undefined;
}

export function getRawUserInput(ticket: Ticket | null | undefined): string | null {
  if (!ticket) return null;
  const flat = flattenTicketFields(ticket);
  const candidates = [flat.user_input, flat.userInput];
  for (const userInput of candidates) {
    if (typeof userInput === "string" && userInput.trim()) {
      return userInput.trim();
    }
  }
  return null;
}

export const USER_INPUT_URL_PATTERN = /https?:\/\/[^\s,]+/i;

export function parseUserInput(raw: string): { values: string[]; audioUrl: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { values: [], audioUrl: null };

  const urlMatch = trimmed.match(USER_INPUT_URL_PATTERN);
  const audioUrl = urlMatch?.[0]?.replace(/[.,;]+$/, "") ?? null;

  const textPart = urlMatch
    ? trimmed.replace(urlMatch[0], "").replace(/^[\s,]+|[\s,]+$/g, "").trim()
    : trimmed;

  const values = textPart
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return { values, audioUrl };
}

export function getParsedUserInput(
  ticket: Ticket | null | undefined
): { raw: string; values: string[]; audioUrl: string | null } | null {
  const raw = getRawUserInput(ticket);
  if (!raw) return null;
  return { raw, ...parseUserInput(raw) };
}

export function getUserInputAudioUrl(ticket: Ticket | null | undefined): string | null {
  const raw = getRawUserInput(ticket);
  if (!raw) return null;
  return parseUserInput(raw).audioUrl;
}

export function parseTicketTasks(raw: any): Array<{ id: string; label: string; statusText: string }> {
  const flat = flattenTicketFields(raw);
  const source = flat.tasks;
  if (!source) return [];

  let tasks: any[] = [];
  if (Array.isArray(source)) {
    tasks = source;
  } else if (typeof source === "string") {
    try {
      const parsed = JSON.parse(source);
      tasks = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      tasks = source.split(",").map((task: string) => task.trim()).filter(Boolean);
    }
  } else if (typeof source === "object") {
    tasks = Object.entries(source).map(([key, value]) => ({
      id: key,
      task: key,
      title: key,
      status: value,
    }));
  }

  return tasks.map((task, index) => {
    if (typeof task === "string") {
      return { id: `task-${index}`, label: task, statusText: "" };
    }
    if (typeof task === "object" && task !== null) {
      const statusValue = task.status ?? task.rawStatus;
      const statusText =
        statusValue === null || statusValue === undefined || statusValue === "Null"
          ? ""
          : String(statusValue);
      const label = task.task || task.title || task.name || `Task ${index + 1}`;
      return {
        id: String(task.id ?? task.task ?? task.title ?? task.name ?? `task-${index}`),
        label,
        statusText,
      };
    }
    return { id: `task-${index}`, label: `Task ${index + 1}`, statusText: "" };
  });
}

export function buildTaskProgressFromTasks(raw: any): TicketTaskProgressStep[] {
  const rawSteps = parseTicketTasks(raw);
  if (!rawSteps.length) return [];

  let currentMarked = false;
  const steps = rawSteps.map((step, index) => {
    const normalizedStatus = step.statusText.toLowerCase().trim();
    let status: TicketTaskProgressStep["status"] = "pending";

    if (!normalizedStatus && index === 0) {
      status = "current";
      currentMarked = true;
    } else if (
      normalizedStatus.includes("done") ||
      normalizedStatus.includes("yes") ||
      normalizedStatus.includes("complete")
    ) {
      status = "completed";
    } else if (
      normalizedStatus.includes("current") ||
      normalizedStatus.includes("progress") ||
      normalizedStatus.includes("ongoing")
    ) {
      status = "current";
      currentMarked = true;
    }

    return { id: step.id, label: step.label, status };
  });

  if (!currentMarked) {
    const firstPendingIndex = steps.findIndex((step) => step.status === "pending");
    if (firstPendingIndex >= 0) {
      steps[firstPendingIndex].status = "current";
    }
  }

  return steps;
}

export function enrichTicketWithTaskProgress(ticket: any): any {
  if (!ticket || typeof ticket !== "object") return ticket;
  if (Array.isArray(ticket.task_progress) && ticket.task_progress.length > 0) {
    return ticket;
  }

  const taskProgress = buildTaskProgressFromTasks(ticket);
  if (!taskProgress.length) return ticket;

  return { ...ticket, task_progress: taskProgress };
}

export function mergeRefreshedTicket(prev: any, refreshed: any): any {
  const merged = normalizeTicketFromApi({ ...prev, ...refreshed });
  const userInput = getRawUserInput(merged) ?? getRawUserInput(prev);
  const hasExplicitTaskProgress =
    Array.isArray(refreshed?.task_progress) && refreshed.task_progress.length > 0;

  const result =
    userInput != null ? { ...merged, user_input: userInput } : merged;

  if (hasExplicitTaskProgress) {
    return result;
  }

  const rebuiltProgress = buildTaskProgressFromTasks(result);
  if (rebuiltProgress.length) {
    return { ...result, task_progress: rebuiltProgress };
  }

  if (Array.isArray(prev?.task_progress) && prev.task_progress.length > 0) {
    return { ...result, task_progress: prev.task_progress };
  }

  return result;
}

export function normalizeTicketFromApi(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;
  const unwrapped =
    raw.ticket?.id != null
      ? raw.ticket
      : raw.data?.id != null
      ? raw.data
      : raw;
  const flat = flattenTicketFields(unwrapped);
  const jatraLink = getJatraLink(flat);
  const userInput = getRawUserInput(flat);
  return enrichTicketWithTaskProgress({
    ...flat,
    ...(jatraLink ? { Jatra_link: jatraLink } : {}),
    ...(userInput ? { user_input: userInput } : {}),
  });
}

export function extractTicketFromApiResponse(ticketData: any): any | null {
  if (!ticketData || typeof ticketData !== "object") return null;
  if (ticketData.ticket?.id) return normalizeTicketFromApi(ticketData.ticket);
  if (ticketData.data?.id) return normalizeTicketFromApi(ticketData.data);
  if (ticketData.id) return normalizeTicketFromApi(ticketData);
  if (Array.isArray(ticketData) && ticketData.length > 0) {
    return normalizeTicketFromApi(ticketData[0]);
  }
  return null;
}

export function resolveTicketRecordId(ticket: { id?: unknown; record_id?: unknown; support_ticket_id?: unknown } | null | undefined): number | null {
  if (!ticket) return null;
  for (const candidate of [ticket.record_id, ticket.id, ticket.support_ticket_id]) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}
