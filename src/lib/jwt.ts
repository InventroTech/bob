/**
 * JWT Utility Functions
 * Extracts user data from JWT token claims
 */

export interface JWTUserData {
  role_id: string;
  tenant_id: string;
  user_id: string;
}

export interface JWTClaims {
  user_data?: JWTUserData;
  email?: string;
  sub?: string;
  [key: string]: any;
}

/**
 * Decodes a JWT token and returns its payload
 * @param token - The JWT token string
 * @returns The decoded JWT payload or null if decoding fails
 */
export function decodeJWT(token: string): JWTClaims | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    // Replace base64url characters if needed
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Extracts user_data from JWT token
 * @param token - The JWT token string
 * @returns The user_data object or null if not found
 */
export function getUserDataFromJWT(token: string): JWTUserData | null {
  const claims = decodeJWT(token);
  return claims?.user_data || null;
}

/**
 * Extracts tenant_id from JWT token
 * @param token - The JWT token string
 * @returns The tenant_id or null if not found
 */
export function getTenantIdFromJWT(token: string): string | null {
  const userData = getUserDataFromJWT(token);
  return userData?.tenant_id || null;
}

/**
 * Extracts role_id from JWT token
 * @param token - The JWT token string
 * @returns The role_id or null if not found
 */
export function getRoleIdFromJWT(token: string): string | null {
  const userData = getUserDataFromJWT(token);
  return userData?.role_id || null;
}

/**
 * Extracts user_id from JWT token
 * @param token - The JWT token string
 * @returns The user_id or null if not found
 */
export function getUserIdFromJWT(token: string): string | null {
  const userData = getUserDataFromJWT(token);
  return userData?.user_id || null;
}
