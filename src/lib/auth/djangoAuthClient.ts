import {
  AuthApiError,
  AuthError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  type AuthChangeEvent,
  type AuthResponse,
  type AuthTokenResponse,
  type AuthTokenResponsePassword,
  type OAuthResponse,
  type Session,
  type SignInWithOAuthCredentials,
  type SignInWithPasswordCredentials,
  type SignOut,
  type SignUpWithPasswordCredentials,
  type Subscription,
  type User,
  type UserAttributes,
  type UserResponse,
} from '@supabase/supabase-js';

export const SESSION_STORAGE_KEY = 'pyro-auth-session';
export const CONFIRMATION_TOKEN_PARAM = 'confirmation_token';
/** Refresh this many seconds before the access token expires. */
const REFRESH_MARGIN_SECONDS = 60;
const RETRY_DELAY_MS = 30_000;
const REFRESH_LOCK_NAME = 'pyro-auth-refresh';

interface BackendUser {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  user_metadata: Record<string, unknown> | null;
}

interface BackendSession {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: BackendUser;
}

type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void | Promise<void>;

type CallResult<T> = { ok: true; data: T } | { ok: false; error: AuthError };

export interface ChangePasswordParams {
  email: string;
  currentPassword: string;
  newPassword: string;
}

export interface DjangoAuthClientOptions {
  /** Backend origin, e.g. `http://localhost:8000`. */
  baseUrl: string;
  storage?: Storage;
  fetchImpl?: typeof fetch;
  /** Start the background refresh timer. Defaults to true. */
  autoRefreshToken?: boolean;
  /** Handle `?confirmation_token=` from the signup email on load. Defaults to true. */
  detectSessionInUrl?: boolean;
  /** One-time migration: return a still-valid access token from an existing Supabase login, if any. */
  getLegacySupabaseToken?: () => Promise<string | null>;
  /** Called after the Supabase login was exchanged so it is not reused. */
  clearLegacySupabaseSession?: () => Promise<void>;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

const toUser = (user: BackendUser): User => ({
  id: user.id,
  email: user.email ?? undefined,
  user_metadata: user.user_metadata ?? {},
  app_metadata: {},
  aud: 'authenticated',
  created_at: '',
  email_confirmed_at: user.email_confirmed_at ?? undefined,
  confirmed_at: user.email_confirmed_at ?? undefined,
});

const toSession = (session: BackendSession): Session => ({
  access_token: session.access_token,
  refresh_token: session.refresh_token,
  token_type: session.token_type,
  expires_in: session.expires_in,
  expires_at: session.expires_at,
  user: toUser(session.user),
});

const isStoredSession = (value: unknown): value is Session => {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<Session>;
  return typeof s.access_token === 'string' && typeof s.refresh_token === 'string' && !!s.user;
};

const isFatalRefreshError = (error: AuthError) =>
  error instanceof AuthApiError && (error.status === 400 || error.status === 401);

export class DjangoAuthClient {
  private readonly baseUrl: string;
  private readonly storage: Storage | null;
  private readonly fetchImpl: typeof fetch;
  private readonly autoRefreshToken: boolean;
  private readonly options: DjangoAuthClientOptions;
  private session: Session | null;
  private readonly listeners = new Map<string, AuthCallback>();
  private listenerSeq = 0;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshInFlight: Promise<{ session: Session | null; error: AuthError | null }> | null = null;
  private readonly initPromise: Promise<void>;

  constructor(options: DjangoAuthClientOptions) {
    this.options = options;
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.storage = options.storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    this.fetchImpl = options.fetchImpl ?? ((...args) => fetch(...args));
    this.autoRefreshToken = options.autoRefreshToken ?? true;
    this.session = this.readStored();

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent);
    }
    this.initPromise = this.initialize();
  }

  // ---------------------------------------------------------------- public API

  async getSession(): Promise<
    { data: { session: Session }; error: null } | { data: { session: null }; error: AuthError } | { data: { session: null }; error: null }
  > {
    await this.initPromise;
    const current = this.session;
    if (!current) return { data: { session: null }, error: null };
    if ((current.expires_at ?? 0) - nowSeconds() > REFRESH_MARGIN_SECONDS / 2) {
      return { data: { session: current }, error: null };
    }
    const { session, error } = await this.refreshInternal(current.refresh_token);
    if (session) return { data: { session }, error: null };
    if (error && !isFatalRefreshError(error)) {
      return { data: { session: current }, error: null };
    }
    return { data: { session: null }, error: null };
  }

  async refreshSession(currentSession?: { refresh_token: string }): Promise<AuthResponse> {
    await this.initPromise;
    const refreshToken = currentSession?.refresh_token ?? this.session?.refresh_token;
    if (!refreshToken) {
      return { data: { user: null, session: null }, error: new AuthSessionMissingError() };
    }
    const { session, error } = await this.refreshInternal(refreshToken);
    if (error || !session) {
      return { data: { user: null, session: null }, error: error ?? new AuthSessionMissingError() };
    }
    return { data: { user: session.user, session }, error: null };
  }

  async signInWithPassword(credentials: SignInWithPasswordCredentials): Promise<AuthTokenResponsePassword> {
    await this.initPromise;
    if (!('email' in credentials)) {
      return { data: { user: null, session: null }, error: new AuthError('Phone login is not supported') };
    }
    const result = await this.call<BackendSession>('/auth/login/', {
      body: { email: credentials.email, password: credentials.password },
    });
    if (!result.ok) return { data: { user: null, session: null }, error: result.error };
    const session = this.saveSession(toSession(result.data), 'SIGNED_IN');
    return { data: { user: session.user, session }, error: null };
  }

  async signUp(credentials: SignUpWithPasswordCredentials): Promise<AuthResponse> {
    await this.initPromise;
    if (!('email' in credentials)) {
      return { data: { user: null, session: null }, error: new AuthError('Phone signup is not supported') };
    }
    const result = await this.call('/auth/signup/', {
      body: {
        email: credentials.email,
        password: credentials.password,
        data: credentials.options?.data ?? {},
        redirect_to: credentials.options?.emailRedirectTo,
      },
    });
    if (!result.ok) return { data: { user: null, session: null }, error: result.error };
    // The account stays unusable until the email link is opened, so there is no session yet.
    return { data: { user: null, session: null }, error: null };
  }

  async signOut(options: SignOut = {}): Promise<{ error: AuthError | null }> {
    await this.initPromise;
    const scope = options.scope ?? 'global';
    if (scope === 'others') return { error: null };
    const refreshToken = this.session?.refresh_token;
    const accessToken = this.session?.access_token;
    this.removeSession();
    if (refreshToken) {
      // Best effort: the local session is already gone even if the server call fails.
      await this.call('/auth/logout/', { body: { refresh_token: refreshToken, scope }, token: accessToken });
    }
    return { error: null };
  }

  onAuthStateChange(callback: AuthCallback): { data: { subscription: Subscription } } {
    const id = `listener-${++this.listenerSeq}`;
    this.listeners.set(id, callback);
    const subscription: Subscription = {
      id,
      callback,
      unsubscribe: () => {
        this.listeners.delete(id);
      },
    };
    void this.initPromise.then(() => {
      if (this.listeners.has(id)) this.notify(callback, 'INITIAL_SESSION', this.session);
    });
    return { data: { subscription } };
  }

  async getUser(jwt?: string): Promise<UserResponse> {
    await this.initPromise;
    const token = jwt ?? (await this.getSession()).data.session?.access_token;
    if (!token) return { data: { user: null }, error: new AuthSessionMissingError() };
    const result = await this.call<BackendUser>('/auth/me/', { method: 'GET', token });
    if (!result.ok) return { data: { user: null }, error: result.error };
    return { data: { user: toUser(result.data) }, error: null };
  }

  async updateUser(attributes: UserAttributes): Promise<UserResponse> {
    await this.initPromise;
    if (attributes.password) {
      return { data: { user: null }, error: new AuthError('Use changePassword() to change the password') };
    }
    if (attributes.email || attributes.phone) {
      return { data: { user: null }, error: new AuthError('Changing email or phone is not supported') };
    }
    const token = (await this.getSession()).data.session?.access_token;
    if (!token) return { data: { user: null }, error: new AuthSessionMissingError() };
    const result = await this.call<BackendUser>('/auth/me/', {
      method: 'PATCH',
      token,
      body: { data: attributes.data ?? {} },
    });
    if (!result.ok) return { data: { user: null }, error: result.error };
    const user = toUser(result.data);
    if (this.session) {
      this.session = { ...this.session, user };
      this.writeStored(this.session);
      this.emit('USER_UPDATED', this.session);
    }
    return { data: { user }, error: null };
  }

  async changePassword({ currentPassword, newPassword }: ChangePasswordParams): Promise<{ error: AuthError | null }> {
    await this.initPromise;
    const token = (await this.getSession()).data.session?.access_token;
    if (!token) return { error: new AuthSessionMissingError() };
    const result = await this.call<BackendSession>('/auth/change-password/', {
      token,
      body: { current_password: currentPassword, password: newPassword },
    });
    if (!result.ok) return { error: result.error };
    // The backend signs out every other device and returns a fresh session for this one.
    this.saveSession(toSession(result.data), 'USER_UPDATED');
    return { error: null };
  }

  async signInWithOAuth(credentials: SignInWithOAuthCredentials): Promise<OAuthResponse> {
    const providerName = String(credentials.provider) === 'custom:zoho' ? 'zoho' : credentials.provider;
    const redirectTo =
      credentials.options?.redirectTo ?? (typeof window !== 'undefined' ? window.location.origin : '');
    const url = `${this.baseUrl}/auth/oauth/${encodeURIComponent(providerName)}/authorize/?redirect_to=${encodeURIComponent(redirectTo)}`;
    if (!credentials.options?.skipBrowserRedirect && typeof window !== 'undefined') {
      window.location.assign(url);
    }
    return { data: { provider: credentials.provider, url }, error: null };
  }

  async exchangeCodeForSession(authCode: string): Promise<AuthTokenResponse> {
    await this.initPromise;
    const result = await this.call<BackendSession>('/auth/oauth/exchange/', { body: { code: authCode } });
    if (!result.ok) return { data: { user: null, session: null }, error: result.error };
    const session = this.saveSession(toSession(result.data), 'SIGNED_IN');
    return { data: { user: session.user, session }, error: null };
  }

  /** Stops timers and listeners. Only needed in tests. */
  dispose(): void {
    this.clearRefreshTimer();
    this.listeners.clear();
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent);
    }
  }

  // ---------------------------------------------------------------- startup

  private async initialize(): Promise<void> {
    try {
      if (this.options.detectSessionInUrl ?? true) {
        await this.confirmEmailFromUrl();
      }
      if (!this.session) {
        await this.migrateLegacySupabaseSession();
      }
    } catch (error) {
      console.warn('[djangoAuth] Startup failed:', error);
    }
    this.scheduleRefresh();
  }

  private async confirmEmailFromUrl(): Promise<void> {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const token = url.searchParams.get(CONFIRMATION_TOKEN_PARAM);
    if (!token) return;

    url.searchParams.delete(CONFIRMATION_TOKEN_PARAM);
    const result = await this.call<BackendSession>('/auth/verify-email/', { body: { token } });
    if (result.ok) {
      this.saveSession(toSession(result.data), 'SIGNED_IN');
    } else {
      url.searchParams.set('error', result.error.code ?? 'invalid_token');
      url.searchParams.set('error_description', result.error.message);
    }
    window.history.replaceState(window.history.state, '', url.toString());
  }

  private async migrateLegacySupabaseSession(): Promise<void> {
    const { getLegacySupabaseToken, clearLegacySupabaseSession } = this.options;
    if (!getLegacySupabaseToken) return;
    const legacyToken = await getLegacySupabaseToken();
    if (!legacyToken) return;

    const result = await this.call<BackendSession>('/auth/token/from-supabase/', {
      body: { access_token: legacyToken },
    });
    if (!result.ok) {
      console.warn('[djangoAuth] Could not carry over the existing login:', result.error.message);
      return;
    }
    this.saveSession(toSession(result.data), 'SIGNED_IN');
    await clearLegacySupabaseSession?.();
  }

  // ---------------------------------------------------------------- refresh

  private refreshInternal(refreshToken: string): Promise<{ session: Session | null; error: AuthError | null }> {
    if (this.refreshInFlight) return this.refreshInFlight;

    const run = async () => {
      // Another tab may already have rotated the token while we waited for the lock.
      const latest = this.readStored();
      if (latest && latest.refresh_token !== refreshToken && (latest.expires_at ?? 0) - nowSeconds() > REFRESH_MARGIN_SECONDS) {
        this.adoptSession(latest);
        return { session: latest, error: null };
      }

      const result = await this.call<BackendSession>('/auth/token/refresh/', {
        body: { refresh_token: refreshToken },
      });
      if (result.ok) {
        return { session: this.saveSession(toSession(result.data), 'TOKEN_REFRESHED'), error: null };
      }

      if (isFatalRefreshError(result.error)) {
        const stored = this.readStored();
        if (stored && stored.refresh_token !== refreshToken) {
          this.adoptSession(stored);
          return { session: stored, error: null };
        }
        if (this.session?.refresh_token === refreshToken || !this.session) {
          this.removeSession();
        }
      } else {
        this.scheduleRefresh(RETRY_DELAY_MS);
      }
      return { session: null, error: result.error };
    };

    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    const pending = (locks ? locks.request(REFRESH_LOCK_NAME, run) : run()).finally(() => {
      this.refreshInFlight = null;
    });
    this.refreshInFlight = pending;
    return pending;
  }

  private scheduleRefresh(delayMs?: number): void {
    this.clearRefreshTimer();
    if (!this.autoRefreshToken || !this.session) return;
    const due = delayMs ?? ((this.session.expires_at ?? 0) - REFRESH_MARGIN_SECONDS) * 1000 - Date.now();
    const refreshToken = this.session.refresh_token;
    this.refreshTimer = setTimeout(() => {
      void this.refreshInternal(refreshToken);
    }, Math.max(due, 1000));
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
  }

  // ---------------------------------------------------------------- session state

  private saveSession(session: Session, event: AuthChangeEvent): Session {
    this.session = session;
    this.writeStored(session);
    this.scheduleRefresh();
    this.emit(event, session);
    return session;
  }

  private adoptSession(session: Session): void {
    const event: AuthChangeEvent = this.session ? 'TOKEN_REFRESHED' : 'SIGNED_IN';
    this.session = session;
    this.scheduleRefresh();
    this.emit(event, session);
  }

  private removeSession(): void {
    const hadSession = !!this.session;
    this.session = null;
    this.clearRefreshTimer();
    try {
      this.storage?.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Storage can be unavailable (private mode); the in-memory session is already cleared.
    }
    if (hadSession) this.emit('SIGNED_OUT', null);
  }

  private readStored(): Session | null {
    try {
      const raw = this.storage?.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return isStoredSession(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private writeStored(session: Session): void {
    try {
      this.storage?.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Storage can be unavailable (private mode); keep the in-memory session.
    }
  }

  private handleStorageEvent = (event: StorageEvent): void => {
    if (event.key !== SESSION_STORAGE_KEY) return;
    const stored = this.readStored();
    if (!stored) {
      if (this.session) {
        this.session = null;
        this.clearRefreshTimer();
        this.emit('SIGNED_OUT', null);
      }
      return;
    }
    if (stored.access_token !== this.session?.access_token) {
      this.adoptSession(stored);
    }
  };

  private emit(event: AuthChangeEvent, session: Session | null): void {
    this.listeners.forEach((callback) => this.notify(callback, event, session));
  }

  private notify(callback: AuthCallback, event: AuthChangeEvent, session: Session | null): void {
    try {
      const result = callback(event, session);
      if (result instanceof Promise) {
        result.catch((error) => console.error('[djangoAuth] Auth listener failed:', error));
      }
    } catch (error) {
      console.error('[djangoAuth] Auth listener failed:', error);
    }
  }

  // ---------------------------------------------------------------- HTTP

  private async call<T = unknown>(
    path: string,
    { method = 'POST', body, token }: { method?: string; body?: unknown; token?: string } = {},
  ): Promise<CallResult<T>> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : 'Network request failed';
      return { ok: false, error: new AuthRetryableFetchError(message, 0) };
    }

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (response.ok) return { ok: true, data: payload as T };

    const message =
      (typeof payload.message === 'string' && payload.message) ||
      (typeof payload.detail === 'string' && payload.detail) ||
      (typeof payload.error === 'string' && payload.error) ||
      `Request failed with status ${response.status}`;
    if (response.status >= 500 || response.status === 429) {
      return { ok: false, error: new AuthRetryableFetchError(message, response.status) };
    }
    const code = typeof payload.error === 'string' ? payload.error : undefined;
    return { ok: false, error: new AuthApiError(message, response.status, code) };
  }
}

export const createDjangoAuthClient = (options: DjangoAuthClientOptions) => new DjangoAuthClient(options);
