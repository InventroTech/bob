interface AuthResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

interface Session {
  access_token: string;
  refresh_token?: string;
  user: User;
}

interface User {
  id: string;
  email: string;
  [key: string]: any;
}

class AuthService {
  private baseUrl: string;

  constructor() {
    // Use your existing environment variables
    this.baseUrl = import.meta.env.VITE_RENDER_API_URL;
  }

  // Sign in with email and password
  async signInWithPassword(email: string, password: string): Promise<AuthResponse<Session>> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/test-supabase-login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { error: errorData.error || 'Login failed', success: false };
      }

      const data = await response.json();
      
      if (data.valid) {
        const session: Session = {
          access_token: data.access_token,
          user: {
            id: data.user_id,
            email: data.email,
          }
        };
        this.setStoredToken(data.access_token);
        return { data: session, success: true };
      } else {
        return { error: data.error || 'Login failed', success: false };
      }
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  // Sign up with email and password
  async signUp(email: string, password: string): Promise<AuthResponse<Session>> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/signup/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { error: errorData.error || 'Signup failed', success: false };
      }

      const data = await response.json();
      
      if (data.success) {
        const session: Session = {
          access_token: data.access_token,
          user: data.user,
        };
        this.setStoredToken(data.access_token);
        return { data: session, success: true };
      } else {
        return { error: data.error || 'Signup failed', success: false };
      }
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  // Sign in with OAuth (Google, GitHub, etc.)
  async signInWithOAuth(provider: 'google' | 'github' | 'discord'): Promise<AuthResponse<string>> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/oauth/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          provider,
          redirect_to: `${window.location.origin}/auth/callback`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { error: errorData.error || 'OAuth failed', success: false };
      }

      const data = await response.json();
      
      if (data.success) {
        // Redirect to the OAuth URL
        window.location.href = data.url;
        return { data: 'redirecting', success: true };
      } else {
        return { error: data.error || 'OAuth failed', success: false };
      }
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  // Get current session
  async getSession(): Promise<AuthResponse<Session>> {
    try {
      const token = this.getStoredToken();
      if (!token) {
        return { error: 'No stored token', success: false };
      }

      const response = await fetch(`${this.baseUrl}/auth/session/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: token }),
      });

      if (!response.ok) {
        this.clearStoredToken();
        return { error: 'Invalid session', success: false };
      }

      const data = await response.json();
      
      if (data.success) {
        return { data: data.session, success: true };
      } else {
        this.clearStoredToken();
        return { error: data.error || 'Invalid session', success: false };
      }
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  // Get current user
  async getUser(): Promise<AuthResponse<User>> {
    try {
      const sessionResponse = await this.getSession();
      if (!sessionResponse.success) {
        return { error: sessionResponse.error, success: false };
      }

      return { data: sessionResponse.data?.user, success: true };
    } catch (error: any) {
      return { error: error.message, success: false };
    }
  }

  // Sign out
  async signOut(): Promise<AuthResponse> {
    try {
      const token = this.getStoredToken();
      
      if (token) {
        const response = await fetch(`${this.baseUrl}/auth/signout/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ access_token: token }),
        });

        // Even if the backend call fails, we should clear local storage
        this.clearStoredToken();
        
        if (response.ok) {
          return { success: true };
        }
      }

      this.clearStoredToken();
      return { success: true };
    } catch (error: any) {
      this.clearStoredToken();
      return { error: error.message, success: false };
    }
  }

  // Set up auth state change listener
  onAuthStateChange(callback: (event: any, session: Session | null) => void): () => void {
    // Simple implementation using polling or manual triggers
    // In a production app, you might use WebSockets or Server-Sent Events
    let isActive = true;
    
    const checkAuthState = async () => {
      if (!isActive) return;
      
      try {
        const sessionResponse = await this.getSession();
        if (sessionResponse.success) {
          callback('SIGNED_IN', sessionResponse.data);
        } else {
          callback('SIGNED_OUT', null);
        }
      } catch (error) {
        callback('SIGNED_OUT', null);
      }
    };

    // Check auth state immediately
    checkAuthState();

    // Return unsubscribe function
    return () => {
      isActive = false;
    };
  }

  // Helper methods for token management
  private getStoredToken(): string | null {
    // Try to get token from localStorage or sessionStorage
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  }

  private setStoredToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  private clearStoredToken(): void {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
  }

  // Get access token for API calls
  async getAccessToken(): Promise<string | null> {
    const sessionResponse = await this.getSession();
    return sessionResponse.success ? sessionResponse.data?.access_token : null;
  }
}

export const authService = new AuthService();

// Export types for use in components
export type { User, Session, AuthResponse };
