/**
 * JWT utility functions for decoding and extracting claims from tokens
 */

export interface EnrichedTokenClaims {
  sub?: string;
  user_id?: string;
  tenant_id?: string;
  role_id?: string;
  role_key?: string;
  email?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

/**
 * Decode JWT token without verification (client-side only)
 * Note: This does NOT verify the signature - use only for reading claims
 */
export function decodeJWT(token: string): EnrichedTokenClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    // Add padding if needed for base64 decoding
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    
    // Decode base64
    const decoded = atob(padded);
    const claims = JSON.parse(decoded);
    
    return claims;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const claims = decodeJWT(token);
  if (!claims || !claims.exp) {
    return true;
  }
  
  const now = Math.floor(Date.now() / 1000);
  return claims.exp < now;
}

/**
 * Extract tenant_id, user_id, role_id, and role_key from JWT token
 * Note: The backend now enriches tokens at login time with tenant and role information.
 * This function extracts what's available from the token itself.
 */
export function extractUserInfo(token: string): {
  tenant_id: string | null;
  user_id: string | null;
  role_id: string | null;
  role_key: string | null;
} {
  const claims = decodeJWT(token);
  if (!claims) {
    return {
      tenant_id: null,
      user_id: null,
      role_id: null,
      role_key: null,
    };
  }

  return {
    tenant_id: claims.tenant_id || null,
    user_id: claims.user_id || claims.sub || null,
    role_id: claims.role_id || null,
    role_key: claims.role_key || null,
  };
}
