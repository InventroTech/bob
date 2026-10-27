/** GET /membership/users with one session refresh + retry when the token is stale. */

export type MembershipUsersResult =
  | { kind: 'ok'; data: unknown }
  /** 401/403 after a retry: the user is signed out or no longer an active member of this tenant. */
  | { kind: 'denied'; status: 401 | 403; reason: string | null }
  | { kind: 'error'; status: number; reason: string | null };

interface FetchMembershipUsersOptions {
  baseUrl: string;
  token: string;
  /** Returns a fresh access token, or null when the session can't be refreshed. */
  refreshToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
}

const isAuthStatus = (status: number): status is 401 | 403 => status === 401 || status === 403;

async function readReason(response: Response): Promise<string | null> {
  const body = await response.json().catch(() => null);
  if (!body || typeof body !== 'object') return null;
  const { detail, message, error } = body as Record<string, unknown>;
  const reason = detail ?? message ?? error;
  return typeof reason === 'string' && reason.trim() ? reason : null;
}

export async function fetchMembershipUsers({
  baseUrl,
  token,
  refreshToken,
  fetchImpl = fetch,
}: FetchMembershipUsersOptions): Promise<MembershipUsersResult> {
  const request = (accessToken: string) =>
    fetchImpl(`${baseUrl}/membership/users`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    });

  let response = await request(token);

  // An expired token or one missing tenant claims comes back as 401 or 403, not only 401.
  if (isAuthStatus(response.status)) {
    const freshToken = await refreshToken().catch(() => null);
    if (freshToken && freshToken !== token) {
      response = await request(freshToken);
    }
  }

  if (response.ok) {
    return { kind: 'ok', data: await response.json() };
  }

  const reason = await readReason(response);
  if (isAuthStatus(response.status)) {
    return { kind: 'denied', status: response.status, reason };
  }
  return { kind: 'error', status: response.status, reason };
}
