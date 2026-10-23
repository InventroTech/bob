import { membershipService } from '@/lib/api/services/membership';
import { getRoleIdFromJWT, getTenantIdFromJWT } from '@/lib/auth/jwt';

/**
 * Tenant and role normally live on the Supabase access token as user_data.
 * After membership moved to AWS, that claim is often missing. The membership
 * API is the source of truth in that case.
 */
export async function resolveTenantAndRole(
  token: string,
  tenantSlug?: string
): Promise<{ tenantId: string; roleId: string } | null> {
  let tenantId = getTenantIdFromJWT(token);
  let roleId = getRoleIdFromJWT(token);
  if (tenantId && roleId) {
    return { tenantId, roleId };
  }

  const membership = await membershipService.getMyMembership(tenantSlug);
  tenantId = tenantId || membership?.tenant_id || null;
  roleId = roleId || membership?.role_id || null;
  if (!tenantId || !roleId) return null;
  return { tenantId, roleId };
}
