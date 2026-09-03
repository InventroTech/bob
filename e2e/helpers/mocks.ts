import type { Page, Route } from '@playwright/test';
import { NEW_PAGE_ID, fakeSession, qaMembership, qaRoles } from './fakes';

const JSON_HEADERS = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
};

function fulfillJson(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    headers: JSON_HEADERS,
    json: body,
  });
}

function isViteRequest(url: URL): boolean {
  return url.port === '8080';
}

export type SupabaseAuthMode = 'accept-login' | 'reject-login' | 'signup-confirm-email';

export async function mockSupabaseAuth(page: Page, mode: SupabaseAuthMode = 'accept-login') {
  const session = fakeSession();

  await page.route('**/auth/v1/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: JSON_HEADERS });
      return;
    }

    if (url.includes('/token') && url.includes('grant_type=password')) {
      if (mode === 'reject-login') {
        await fulfillJson(route, {
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
          msg: 'Invalid login credentials',
        }, 400);
        return;
      }
      await fulfillJson(route, session);
      return;
    }

    if (url.includes('/token')) {
      await fulfillJson(route, session);
      return;
    }

    if (url.includes('/signup')) {
      if (mode === 'signup-confirm-email') {
        await fulfillJson(route, { user: session.user, session: null });
        return;
      }
      await fulfillJson(route, session);
      return;
    }

    if (url.includes('/user')) {
      await fulfillJson(route, session.user);
      return;
    }

    if (url.includes('/logout')) {
      await route.fulfill({ status: 204, headers: JSON_HEADERS });
      return;
    }

    await fulfillJson(route, {});
  });
}

export async function mockBackendApis(page: Page) {
  let createdPage: Record<string, unknown> | null = null;

  await page.route((url) => !isViteRequest(url) && !url.pathname.includes('/auth/v1/'), async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const method = route.request().method();
    const accept = route.request().headers()['accept'] || '';

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: JSON_HEADERS });
      return;
    }

    if (path.includes('/rest/v1/tenants')) {
      const row = { id: qaMembership.tenant_id, slug: qaMembership.tenant_slug };
      await fulfillJson(route, accept.includes('vnd.pgrst.object') ? row : [row]);
      return;
    }

    if (path.includes('/rest/v1/pages')) {
      await fulfillJson(route, []);
      return;
    }

    if (path.endsWith('/membership/me/role')) {
      await fulfillJson(route, qaMembership);
      return;
    }

    if (path.endsWith('/membership/roles')) {
      await fulfillJson(route, qaRoles);
      return;
    }

    if (path.endsWith('/membership/users')) {
      await fulfillJson(route, { count: 0, results: [] });
      return;
    }

    if (path.endsWith('/membership/billing')) {
      await fulfillJson(route, {
        month: '2026-08',
        period_start: '2026-08-01',
        period_end: '2026-08-31',
        cycle_days: 31,
        excluded_email_domain: '@thepyro.ai',
        billing_roles: [],
        role_rates: {},
        summary: {
          member_count: 0,
          total_billable_days: 0,
          total_amount: '0',
        },
        results: [],
      });
      return;
    }

    if (path.endsWith('/accounts/setup-new-tenant')) {
      await fulfillJson(route, {
        success: true,
        tenant_id: qaMembership.tenant_id,
        tenant_slug: qaMembership.tenant_slug,
        role_id: qaMembership.role_id,
        role_key: qaMembership.role_key,
        message: 'Already set up',
      });
      return;
    }

    if (path.endsWith('/accounts/link-user-uid')) {
      await fulfillJson(route, { success: true });
      return;
    }

    if (path.endsWith('/auth/forgot-password')) {
      await fulfillJson(route, { ok: true });
      return;
    }

    if (path.endsWith('/auth/reset-password/confirm')) {
      await fulfillJson(route, { ok: true });
      return;
    }

    if (path.endsWith('/pages/custom-icons')) {
      await fulfillJson(route, []);
      return;
    }

    if (path.endsWith('/pages')) {
      if (method === 'POST') {
        let body: Record<string, unknown> = {};
        try {
          body = (route.request().postDataJSON() as Record<string, unknown> | null) ?? {};
        } catch {
          body = {};
        }
        createdPage = { id: NEW_PAGE_ID, ...body };
        await fulfillJson(route, createdPage);
        return;
      }
      await fulfillJson(route, createdPage ? [createdPage] : []);
      return;
    }

    const pageById = path.match(/\/pages\/([^/]+)$/);
    if (pageById && method !== 'POST') {
      const id = pageById[1];
      const payload = createdPage && createdPage.id === id
        ? createdPage
        : { id, name: 'Untitled Page', config: [], header_title: '', display_order: 0, icon_name: 'Sparkles' };
      await fulfillJson(route, payload);
      return;
    }

    if (path.endsWith('/crm-records/entity-types')) {
      await fulfillJson(route, []);
      return;
    }

    if (path.endsWith('/user-settings/me/lead-group-summary')) {
      await fulfillJson(route, {
        tenant_membership_id: qaMembership.tenant_membership_id,
        group_id: 7,
        group_name: 'North Zone',
        fresh_leads_count: 12,
        daily_limit: 40,
        daily_target: 10,
      });
      return;
    }

    if (path.endsWith('/crm-records/events/count')) {
      await fulfillJson(route, { count: 2 });
      return;
    }

    if (path.endsWith('/analytics/get-ticket-status')) {
      await fulfillJson(route, {
        ticketStats: {
          totalPendingTickets: 3,
          wipTickets: 1,
          resolvedByYouToday: 1,
          cantResolveToday: 0,
          pendingByPoster: [
            { poster: 'in_trial', count: 2 },
            { poster: 'paid', count: 1 },
          ],
        },
      });
      return;
    }

    if (path.endsWith('/crm-records/get-next-lead')) {
      await fulfillJson(route, {});
      return;
    }

    if (path.endsWith('/support-ticket/get-next-ticket')) {
      await fulfillJson(route, {});
      return;
    }

    if (path.endsWith('/crm-records/records') && method === 'GET') {
      await fulfillJson(route, { results: [] });
      return;
    }

    if (path.endsWith('/jobs/types') || path.endsWith('/pyro-jobs/types')) {
      await fulfillJson(route, ['example_job']);
      return;
    }

    await fulfillJson(route, {});
  });
}

/**
 * Makes supabase-js treat the browser as already signed in, without knowing
 * the project-ref storage key.
 */
export async function seedBrowserSession(page: Page) {
  const session = fakeSession();
  await page.addInitScript((sessionJson) => {
    let current: string | null = sessionJson;
    const origGet = Storage.prototype.getItem;
    const origRemove = Storage.prototype.removeItem;

    Storage.prototype.getItem = function (key: string) {
      if (typeof key === 'string' && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        return current;
      }
      return origGet.call(this, key);
    };

    Storage.prototype.removeItem = function (key: string) {
      if (typeof key === 'string' && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        current = null;
      }
      return origRemove.call(this, key);
    };
  }, JSON.stringify(session));
}

export async function openLoggedIn(page: Page, path = '/') {
  // Pre-seed tenant_slug in localStorage before the page initializes so tests can read it
  await page.addInitScript(() => {
    localStorage.setItem('tenant_slug', 'qa-org');
  });

  await mockSupabaseAuth(page, 'accept-login');
  await mockBackendApis(page);
  await seedBrowserSession(page);
  await page.goto(path);
}