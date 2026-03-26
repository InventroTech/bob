import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { authService } from '@/lib/api/services/auth';
import { getRoleIdFromJWT } from '@/lib/jwt';

/** Link Supabase user to tenant membership after login/signup for custom apps. */
export async function linkCustomAppUserIfNeeded(
  session: Session | null,
  uid: string,
  userEmail: string
): Promise<void> {
  localStorage.setItem('user_email', userEmail);

  try {
    const isAlreadyLinked = session?.access_token && getRoleIdFromJWT(session.access_token);

    if (isAlreadyLinked) return;

    const result = await authService.linkUserUid({ uid, email: userEmail });

    if (result.success === false || result.error) {
      const errorCode = (result as { code?: string }).code;
      const errorMessage = result.error || '';
      const isExpectedError =
        errorCode === 'NO_TENANT_MEMBERSHIP' ||
        errorMessage.includes('No TenantMembership found') ||
        errorMessage.includes('already has a linked UID') ||
        errorMessage.includes('already linked');

      if (!isExpectedError) {
        console.error('[CustomAppAuth] Error linking user UID:', result.error);
        toast.error('Warning: User linking failed, but login will continue');
      }
      return;
    }

    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.warn('[CustomAppAuth] Session refresh failed after linking:', refreshError);
    }
  } catch (linkError) {
    console.error('[CustomAppAuth] Error during user linking:', linkError);
    toast.error('Warning: User linking failed, but login will continue');
  }
}
