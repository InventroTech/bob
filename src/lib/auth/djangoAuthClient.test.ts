import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthChangeEvent } from '@supabase/supabase-js';
import { DjangoAuthClient, SESSION_STORAGE_KEY, type DjangoAuthClientOptions } from './djangoAuthClient';

const BASE = 'http://api.test';

const backendSession = (suffix: string, expiresIn = 3600) => ({
  access_token: `access-${suffix}`,
  token_type: 'bearer',
  expires_in: expiresIn,
  expires_at: Math.floor(Date.now() / 1000) + expiresIn,
  refresh_token: `refresh-${suffix}`,
  user: {
    id: 'user-1',
    email: 'demo@example.com',
    email_confirmed_at: '2026-01-01T00:00:00',
    user_metadata: { tenant_slug: 'acme' },
  },
});

const json = (body: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

type Route = (body: Record<string, unknown>, init: RequestInit) => Response | Promise<Response>;

const mockFetch = (routes: Record<string, Route>) =>
  vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const path = String(input).replace(BASE, '');
    const route = routes[path];
    if (!route) throw new Error(`Unexpected request to ${path}`);
    const body = init.body ? JSON.parse(String(init.body)) : {};
    return route(body, init);
  });

const clients: DjangoAuthClient[] = [];

const makeClient = (fetchImpl: ReturnType<typeof mockFetch>, options: Partial<DjangoAuthClientOptions> = {}) => {
  const client = new DjangoAuthClient({
    baseUrl: BASE,
    storage: window.localStorage,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    ...options,
  });
  clients.push(client);
  return client;
};

const storeSession = (session: ReturnType<typeof backendSession>) => {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
};

const recordEvents = (client: DjangoAuthClient) => {
  const events: AuthChangeEvent[] = [];
  client.onAuthStateChange((event) => {
    events.push(event);
  });
  return events;
};

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  clients.splice(0).forEach((client) => client.dispose());
  vi.restoreAllMocks();
});

describe('DjangoAuthClient login', () => {
  it('signs in with email and password and stores the session', async () => {
    const fetchImpl = mockFetch({ '/auth/login/': () => json(backendSession('a')) });
    const client = makeClient(fetchImpl);
    const events = recordEvents(client);

    const { data, error } = await client.signInWithPassword({ email: 'demo@example.com', password: 'pw' });

    expect(error).toBeNull();
    expect(data.session?.access_token).toBe('access-a');
    expect(data.user?.email).toBe('demo@example.com');
    expect(data.user?.user_metadata).toEqual({ tenant_slug: 'acme' });
    expect(JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY)!).refresh_token).toBe('refresh-a');
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toEqual({ email: 'demo@example.com', password: 'pw' });
    expect(events).toContain('SIGNED_IN');
  });

  it('returns the backend error code and message for wrong credentials', async () => {
    const fetchImpl = mockFetch({
      '/auth/login/': () => json({ error: 'invalid_credentials', message: 'Invalid login credentials' }, 400),
    });
    const client = makeClient(fetchImpl);

    const { data, error } = await client.signInWithPassword({ email: 'demo@example.com', password: 'bad' });

    expect(data.session).toBeNull();
    expect(error?.message).toBe('Invalid login credentials');
    expect(error?.code).toBe('invalid_credentials');
    expect(error?.status).toBe(400);
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('reports network failures as retryable', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const client = makeClient(fetchImpl as unknown as ReturnType<typeof mockFetch>);

    const { error } = await client.signInWithPassword({ email: 'demo@example.com', password: 'pw' });

    expect(error?.name).toBe('AuthRetryableFetchError');
  });

  it('signs up without creating a session and forwards metadata and redirect', async () => {
    const fetchImpl = mockFetch({
      '/auth/signup/': () => json({ user: null, session: null, message: 'Check your email' }),
    });
    const client = makeClient(fetchImpl);

    const { data, error } = await client.signUp({
      email: 'new@example.com',
      password: 'Str0ng-password!',
      options: { data: { tenant_slug: 'acme' }, emailRedirectTo: 'http://localhost:8080/auth' },
    });

    expect(error).toBeNull();
    expect(data.session).toBeNull();
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toEqual({
      email: 'new@example.com',
      password: 'Str0ng-password!',
      data: { tenant_slug: 'acme' },
      redirect_to: 'http://localhost:8080/auth',
    });
  });
});

describe('DjangoAuthClient refresh', () => {
  it('refreshes an almost-expired session in getSession', async () => {
    storeSession(backendSession('old', 10));
    const fetchImpl = mockFetch({ '/auth/token/refresh/': () => json(backendSession('new')) });
    const client = makeClient(fetchImpl);
    const events = recordEvents(client);

    const { data } = await client.getSession();

    expect(data.session?.access_token).toBe('access-new');
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toEqual({ refresh_token: 'refresh-old' });
    expect(events).toContain('TOKEN_REFRESHED');
  });

  it('returns a fresh session without calling the backend', async () => {
    storeSession(backendSession('a'));
    const fetchImpl = mockFetch({});
    const client = makeClient(fetchImpl);

    const { data } = await client.getSession();

    expect(data.session?.access_token).toBe('access-a');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('shares one refresh request between concurrent callers', async () => {
    storeSession(backendSession('old'));
    const fetchImpl = mockFetch({ '/auth/token/refresh/': () => json(backendSession('new')) });
    const client = makeClient(fetchImpl);

    const [first, second] = await Promise.all([client.refreshSession(), client.refreshSession()]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(first.data.session?.access_token).toBe('access-new');
    expect(second.data.session?.access_token).toBe('access-new');
  });

  it('signs out locally when the refresh token is rejected', async () => {
    storeSession(backendSession('old'));
    const fetchImpl = mockFetch({
      '/auth/token/refresh/': () => json({ error: 'invalid_grant', message: 'Refresh token revoked' }, 400),
    });
    const client = makeClient(fetchImpl);
    const events = recordEvents(client);

    const { error } = await client.refreshSession();

    expect(error?.code).toBe('invalid_grant');
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect((await client.getSession()).data.session).toBeNull();
    expect(events).toContain('SIGNED_OUT');
  });

  it('adopts the session another tab already refreshed instead of signing out', async () => {
    storeSession(backendSession('old'));
    const fetchImpl = mockFetch({
      '/auth/token/refresh/': () => {
        storeSession(backendSession('other-tab'));
        return json({ error: 'invalid_grant', message: 'Refresh token revoked' }, 400);
      },
    });
    const client = makeClient(fetchImpl);

    const { data, error } = await client.refreshSession();

    expect(error).toBeNull();
    expect(data.session?.access_token).toBe('access-other-tab');
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull();
  });

  it('keeps the session when refresh fails because of the network', async () => {
    storeSession(backendSession('old'));
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const client = makeClient(fetchImpl as unknown as ReturnType<typeof mockFetch>);

    const { error } = await client.refreshSession();

    expect(error?.name).toBe('AuthRetryableFetchError');
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull();
  });
});

describe('DjangoAuthClient sign out and account', () => {
  it('signs out everywhere by default and clears storage', async () => {
    storeSession(backendSession('a'));
    const fetchImpl = mockFetch({ '/auth/logout/': () => json(null, 204) });
    const client = makeClient(fetchImpl);
    const events = recordEvents(client);

    const { error } = await client.signOut();

    expect(error).toBeNull();
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toEqual({ refresh_token: 'refresh-a', scope: 'global' });
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(events).toContain('SIGNED_OUT');
  });

  it('clears the local session even if the logout request fails', async () => {
    storeSession(backendSession('a'));
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const client = makeClient(fetchImpl as unknown as ReturnType<typeof mockFetch>);

    await client.signOut({ scope: 'local' });

    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('loads the user from /auth/me/ with the access token', async () => {
    storeSession(backendSession('a'));
    const fetchImpl = mockFetch({ '/auth/me/': () => json(backendSession('a').user) });
    const client = makeClient(fetchImpl);

    const { data, error } = await client.getUser();

    expect(error).toBeNull();
    expect(data.user?.id).toBe('user-1');
    expect((fetchImpl.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe('Bearer access-a');
  });

  it('treats a rejected token in getUser as an auth error, not a network error', async () => {
    storeSession(backendSession('a'));
    const fetchImpl = mockFetch({ '/auth/me/': () => json({ detail: 'User not found' }, 401) });
    const client = makeClient(fetchImpl);

    const { data, error } = await client.getUser();

    expect(data.user).toBeNull();
    expect(error?.name).toBe('AuthApiError');
    expect(error?.status).toBe(401);
  });

  it('updates profile metadata and emits USER_UPDATED', async () => {
    storeSession(backendSession('a'));
    const updated = { ...backendSession('a').user, user_metadata: { full_name: 'Demo User' } };
    const fetchImpl = mockFetch({ '/auth/me/': () => json(updated) });
    const client = makeClient(fetchImpl);
    const events = recordEvents(client);

    const { data, error } = await client.updateUser({ data: { full_name: 'Demo User' } });

    expect(error).toBeNull();
    expect(data.user?.user_metadata).toEqual({ full_name: 'Demo User' });
    expect(fetchImpl.mock.calls[0][1]?.method).toBe('PATCH');
    expect(events).toContain('USER_UPDATED');
  });

  it('does not change passwords through updateUser', async () => {
    storeSession(backendSession('a'));
    const fetchImpl = mockFetch({});
    const client = makeClient(fetchImpl);

    const { error } = await client.updateUser({ password: 'new-password' });

    expect(error).not.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('changes the password and replaces the session', async () => {
    storeSession(backendSession('a'));
    const fetchImpl = mockFetch({ '/auth/change-password/': () => json(backendSession('b')) });
    const client = makeClient(fetchImpl);

    const { error } = await client.changePassword({
      email: 'demo@example.com',
      currentPassword: 'old-pw',
      newPassword: 'New-passw0rd!',
    });

    expect(error).toBeNull();
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toEqual({
      current_password: 'old-pw',
      password: 'New-passw0rd!',
    });
    expect((await client.getSession()).data.session?.access_token).toBe('access-b');
  });

  it('reports a wrong current password with the invalid_credentials code', async () => {
    storeSession(backendSession('a'));
    const fetchImpl = mockFetch({
      '/auth/change-password/': () => json({ error: 'invalid_credentials', message: 'Current password is incorrect' }, 400),
    });
    const client = makeClient(fetchImpl);

    const { error } = await client.changePassword({
      email: 'demo@example.com',
      currentPassword: 'wrong',
      newPassword: 'New-passw0rd!',
    });

    expect(error?.code).toBe('invalid_credentials');
    expect((await client.getSession()).data.session?.access_token).toBe('access-a');
  });
});

describe('DjangoAuthClient OAuth', () => {
  it('builds the backend authorize URL and maps custom:zoho to zoho', async () => {
    const client = makeClient(mockFetch({}));

    const { data } = await client.signInWithOAuth({
      provider: 'custom:zoho' as never,
      options: { redirectTo: 'http://localhost:8080/app/acme/auth/callback', skipBrowserRedirect: true },
    });

    expect(data.url).toBe(
      `${BASE}/auth/oauth/zoho/authorize/?redirect_to=${encodeURIComponent('http://localhost:8080/app/acme/auth/callback')}`,
    );
  });

  it('exchanges the one-time login code for a session', async () => {
    const fetchImpl = mockFetch({ '/auth/oauth/exchange/': () => json(backendSession('oauth')) });
    const client = makeClient(fetchImpl);

    const { data, error } = await client.exchangeCodeForSession('one-time-code');

    expect(error).toBeNull();
    expect(data.session?.access_token).toBe('access-oauth');
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toEqual({ code: 'one-time-code' });
  });
});

describe('DjangoAuthClient startup', () => {
  it('confirms the email from the link and removes the token from the URL', async () => {
    window.history.replaceState(null, '', '/auth?confirmation_token=tok-123&keep=1');
    const fetchImpl = mockFetch({ '/auth/verify-email/': () => json(backendSession('verified')) });
    const client = makeClient(fetchImpl, { detectSessionInUrl: true });

    const { data } = await client.getSession();

    expect(data.session?.access_token).toBe('access-verified');
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toEqual({ token: 'tok-123' });
    expect(window.location.search).toBe('?keep=1');
  });

  it('puts the error in the URL when the confirmation link is invalid', async () => {
    window.history.replaceState(null, '', '/auth?confirmation_token=expired');
    const fetchImpl = mockFetch({
      '/auth/verify-email/': () => json({ error: 'invalid_token', message: 'Link expired' }, 400),
    });
    const client = makeClient(fetchImpl, { detectSessionInUrl: true });

    const { data } = await client.getSession();

    expect(data.session).toBeNull();
    const params = new URLSearchParams(window.location.search);
    expect(params.get('confirmation_token')).toBeNull();
    expect(params.get('error_description')).toBe('Link expired');
  });

  it('carries over an existing Supabase login once', async () => {
    const fetchImpl = mockFetch({ '/auth/token/from-supabase/': () => json(backendSession('migrated')) });
    const clearLegacy = vi.fn(async () => {});
    const client = makeClient(fetchImpl, {
      getLegacySupabaseToken: async () => 'supabase-access-token',
      clearLegacySupabaseSession: clearLegacy,
    });

    const { data } = await client.getSession();

    expect(data.session?.access_token).toBe('access-migrated');
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toEqual({ access_token: 'supabase-access-token' });
    expect(clearLegacy).toHaveBeenCalledTimes(1);
  });

  it('keeps the Supabase login when it cannot be carried over', async () => {
    const fetchImpl = mockFetch({
      '/auth/token/from-supabase/': () => json({ error: 'invalid_token', message: 'User not found' }, 400),
    });
    const clearLegacy = vi.fn(async () => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = makeClient(fetchImpl, {
      getLegacySupabaseToken: async () => 'supabase-access-token',
      clearLegacySupabaseSession: clearLegacy,
    });

    const { data } = await client.getSession();

    expect(data.session).toBeNull();
    expect(clearLegacy).not.toHaveBeenCalled();
  });

  it('skips the carry-over when a Django session already exists', async () => {
    storeSession(backendSession('a'));
    const getLegacy = vi.fn(async () => 'supabase-access-token');
    const client = makeClient(mockFetch({}), { getLegacySupabaseToken: getLegacy });

    await client.getSession();

    expect(getLegacy).not.toHaveBeenCalled();
  });

  it('sends INITIAL_SESSION to new listeners', async () => {
    storeSession(backendSession('a'));
    const client = makeClient(mockFetch({}));
    const callback = vi.fn();

    client.onAuthStateChange(callback);
    await client.getSession();
    await Promise.resolve();

    expect(callback).toHaveBeenCalledWith('INITIAL_SESSION', expect.objectContaining({ access_token: 'access-a' }));
  });
});
