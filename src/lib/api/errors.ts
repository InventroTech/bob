/**
 * Custom API Error Classes
 * Provides structured error handling for API calls
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed', status?: number, data?: any) {
    super(message, status, 'Unauthorized', data);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Access denied', status?: number, data?: any) {
    super(message, status, 'Forbidden', data);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', data?: any) {
    super(message, 404, 'Not Found', data);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed', data?: any) {
    super(message, 400, 'Bad Request', data);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/** Single-line detail for logs / Sentry (axios errors use response; ApiError uses status/data). */
export function formatClientErrorDetail(error: unknown): string {
  if (error == null) return 'unknown';
  if (typeof error !== 'object') return String(error);
  const e = error as {
    name?: string;
    message?: string;
    status?: number;
    response?: { status?: number; data?: unknown };
    data?: unknown;
  };
  const status = e.response?.status ?? e.status;
  const msg = e.message ?? String(error);
  const data = e.response?.data ?? e.data;
  let dataStr = '';
  try {
    if (data !== undefined) {
      dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    }
  } catch {
    dataStr = '[unserializable]';
  }
  const prefix = e.name && e.name !== 'Error' ? `${e.name}: ` : '';
  const statusPart = status != null ? ` HTTP ${status}` : '';
  const dataPart = dataStr ? ` | ${dataStr}` : '';
  return `${prefix}${msg}${statusPart}${dataPart}`;
}

/**
 * Session expired, logged-out tab, or tenant/membership no longer allows the call.
 * These should not break the UI or spam Sentry as hard failures.
 */
export function isExpectedAuthWall(error: unknown): boolean {
  if (error instanceof AuthorizationError || error instanceof AuthenticationError) {
    return true;
  }
  if (error == null || typeof error !== 'object') return false;
  const e = error as { name?: string; status?: number; response?: { status?: number } };
  if (e.name === 'AuthorizationError' || e.name === 'AuthenticationError') return true;
  const st = e.response?.status ?? e.status;
  return st === 401 || st === 403;
}

function readValidationDetails(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as { details?: unknown; error?: unknown };
  if (d.details && typeof d.details === 'object' && !Array.isArray(d.details)) {
    return d.details as Record<string, unknown>;
  }
  return null;
}

/** Stale session / ticket already closed — save-and-continue returns 400 with ticketId errors. */
export function isStaleTicketSaveError(error: unknown): boolean {
  const data =
    error instanceof ValidationError || error instanceof ApiError ? error.data : null;
  const blob = typeof data === 'string' ? data : JSON.stringify(data ?? '');
  if (/ticket not found/i.test(blob)) return true;

  const details = readValidationDetails(data);
  if (!details?.ticketId) return false;
  const msgs = Array.isArray(details.ticketId) ? details.ticketId : [details.ticketId];
  return msgs.some((m) => /ticket not found/i.test(String(m)));
}

const SUPPORT_TICKET_WRITE_PATH =
  /\/support-ticket\/(save-and-continue|update-call-status)\/?/i;

/** HTTP client integration errors for expected stale-ticket writes (not actionable in Sentry). */
export function isExpectedSupportTicketHttpClientError(
  url: string | undefined,
  status: number | undefined,
): boolean {
  if (!url || status !== 400) return false;
  return SUPPORT_TICKET_WRITE_PATH.test(url);
}

export function isExpectedTicketSaveError(error: unknown): boolean {
  return isStaleTicketSaveError(error);
}

/** Stale carousel / refresh — record was resolved, deleted, or no longer visible to this user. */
export function isExpectedTicketRecordNotFound(error: unknown): boolean {
  if (error instanceof NotFoundError) {
    return true;
  }
  if (error == null || typeof error !== 'object') return false;
  const e = error as { name?: string; status?: number; response?: { status?: number } };
  if (e.name === 'NotFoundError') return true;
  return (e.response?.status ?? e.status) === 404;
}

export function formatTicketSaveErrorMessage(error: unknown): string {
  if (isStaleTicketSaveError(error)) {
    return 'This ticket is no longer available. Use “Get Tickets” to load a new one.';
  }
  const data =
    error instanceof ValidationError || error instanceof ApiError ? error.data : null;
  const details = readValidationDetails(data);
  if (details) {
    const parts = Object.entries(details).flatMap(([key, value]) => {
      const msgs = Array.isArray(value) ? value : [value];
      return msgs.filter(Boolean).map((m) => `${key}: ${m}`);
    });
    if (parts.length) return parts.join(' · ');
  }
  if (error instanceof Error && error.message && error.message !== 'Invalid request data') {
    return error.message;
  }
  return 'Failed to process action. Please try again.';
}

