import { describe, expect, it, vi } from 'vitest';
import { fetchMembershipUsers } from './fetchMembershipUsers';

const BASE_URL = 'https://api.example.com';
const USERS = { count: 1, results: [{ id: 1, email: 'a@praja.in' }] };

const jsonResponse = (status: number, body: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function setup(responses: Response[], freshToken: string | null = 'fresh-token') {
  const fetchImpl = vi.fn<typeof fetch>();
  responses.forEach((res) => fetchImpl.mockResolvedValueOnce(res));
  const refreshToken = vi.fn().mockResolvedValue(freshToken);
  const run = () => fetchMembershipUsers({ baseUrl: BASE_URL, token: 'old-token', refreshToken, fetchImpl });
  const tokenOfCall = (n: number) =>
    (fetchImpl.mock.calls[n][1]?.headers as Record<string, string>).Authorization;
  return { fetchImpl, refreshToken, run, tokenOfCall };
}

describe('fetchMembershipUsers', () => {
  it('returns the users on success without refreshing the session', async () => {
    const { fetchImpl, refreshToken, run, tokenOfCall } = setup([jsonResponse(200, USERS)]);

    await expect(run()).resolves.toEqual({ kind: 'ok', data: USERS });
    expect(refreshToken).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe(`${BASE_URL}/membership/users`);
    expect(tokenOfCall(0)).toBe('Bearer old-token');
  });

  it('refreshes and retries once when a stale token gets 403, then succeeds', async () => {
    const { fetchImpl, refreshToken, run, tokenOfCall } = setup([
      jsonResponse(403, { detail: 'Not a member of this tenant' }),
      jsonResponse(200, USERS),
    ]);

    await expect(run()).resolves.toEqual({ kind: 'ok', data: USERS });
    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(tokenOfCall(1)).toBe('Bearer fresh-token');
  });

  it('refreshes and retries once on 401 too', async () => {
    const { fetchImpl, run } = setup([jsonResponse(401, { detail: 'Token expired' }), jsonResponse(200, USERS)]);

    await expect(run()).resolves.toEqual({ kind: 'ok', data: USERS });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('reports denied with the backend reason when the retry is still 403', async () => {
    const { fetchImpl, run } = setup([
      jsonResponse(403, { detail: 'Not a member of this tenant' }),
      jsonResponse(403, { detail: 'Not a member of this tenant' }),
    ]);

    await expect(run()).resolves.toEqual({ kind: 'denied', status: 403, reason: 'Not a member of this tenant' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry when the session cannot be refreshed', async () => {
    const { fetchImpl, run } = setup([jsonResponse(403, { detail: 'Forbidden' })], null);

    await expect(run()).resolves.toEqual({ kind: 'denied', status: 403, reason: 'Forbidden' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not retry when the refresh returns the same token', async () => {
    const { fetchImpl, run } = setup([jsonResponse(403, {})], 'old-token');

    await expect(run()).resolves.toEqual({ kind: 'denied', status: 403, reason: null });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('treats a refresh that throws like a failed refresh', async () => {
    const { fetchImpl, refreshToken, run } = setup([jsonResponse(403, {})]);
    refreshToken.mockRejectedValueOnce(new Error('network down'));

    await expect(run()).resolves.toEqual({ kind: 'denied', status: 403, reason: null });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('reports other failures as errors without refreshing', async () => {
    const { refreshToken, run } = setup([jsonResponse(500, { message: 'Database unavailable' })]);

    await expect(run()).resolves.toEqual({ kind: 'error', status: 500, reason: 'Database unavailable' });
    expect(refreshToken).not.toHaveBeenCalled();
  });

  it('reads the reason from detail, then message, then error', async () => {
    const reasonOf = async (body: unknown) => {
      const { run } = setup([jsonResponse(500, body)]);
      const result = await run();
      return result.kind === 'error' ? result.reason : undefined;
    };

    expect(await reasonOf({ detail: 'from detail', message: 'from message' })).toBe('from detail');
    expect(await reasonOf({ message: 'from message', error: 'from error' })).toBe('from message');
    expect(await reasonOf({ error: 'from error' })).toBe('from error');
  });

  it('returns a null reason when the error body is empty or not JSON', async () => {
    const { run } = setup([new Response('<html>Bad gateway</html>', { status: 502 })]);

    await expect(run()).resolves.toEqual({ kind: 'error', status: 502, reason: null });
  });
});
