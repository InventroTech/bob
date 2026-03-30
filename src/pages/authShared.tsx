import React, { useState, useEffect, useRef } from 'react';
import { authService } from '@/lib/api/services/auth';
import { useAuth } from '@/hooks/useAuth';

export const DEFAULT_TENANT_SLUG = 'my-organization';

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export const PostLoginTenantSetup = () => {
  const { session } = useAuth();
  const [status, setStatus] = useState('Setting up...');
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !session?.user) return;
    done.current = true;
    const user = session.user;
    const tenantName = user.email || `Tenant for ${user.id}`;
    const metadataSlug = (user.user_metadata as { tenant_slug?: string })?.tenant_slug?.trim();
    const pendingSlug = sessionStorage.getItem('pending_tenant_slug');
    const rawSlug = pendingSlug?.trim() || metadataSlug;
    const tenantSlug = rawSlug ? (slugify(rawSlug) || DEFAULT_TENANT_SLUG) : (slugify(tenantName) || DEFAULT_TENANT_SLUG);
    if (pendingSlug) sessionStorage.removeItem('pending_tenant_slug');

    (async () => {
      try {
        const result = await authService.setupNewTenant({ tenant_slug: tenantSlug, tenant_name: tenantName });
        if (result.error || !result.success) {
          setStatus(`Error: ${result.error || 'Setup failed'}`);
          return;
        }
        if (result.tenant_slug) {
          localStorage.setItem('tenant_slug', result.tenant_slug);
        }
        setStatus('Redirecting...');
        window.location.replace('/');
      } catch (e: any) {
        setStatus(`Error: ${e?.response?.data?.error || e?.message || 'Setup failed'}`);
      }
    })();
  }, [session]);
  return <div>{status}</div>;
};
