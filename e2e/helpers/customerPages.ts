import type { Page, Route } from '@playwright/test';
import { QA_TENANT } from './fakes';
import { mockBackendApis, mockSupabaseAuth, seedBrowserSession } from './mocks';

const JSON_HEADERS = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
};

function fulfillJson(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, headers: JSON_HEADERS, json: body });
}

export const CUSTOMER_PAGES = {
  pendingLeads: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Pending Leads',
    display_order: 1,
    icon_name: 'Sparkles',
    header_title: 'Pending Leads',
    config: [
      {
        id: 'lead-carousel-1',
        type: 'leadCarousel',
        props: {},
        config: {
          title: 'Pending Leads',
          apiEndpoint: '/crm-records/get-next-lead/',
        },
      },
    ],
  },
  pendingTickets: {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: 'Pending Tickets',
    display_order: 2,
    icon_name: 'Ticket',
    header_title: 'Pending Tickets',
    config: [
      {
        id: 'ticket-carousel-1',
        type: 'ticketCarousel',
        props: {},
        config: { title: "Today's Tickets" },
      },
    ],
  },
  createRequest: {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    name: 'Create Request',
    display_order: 3,
    icon_name: 'Truck',
    header_title: 'Create Request',
    config: [
      {
        id: 'inv-form-1',
        type: 'inventoryRequestForm',
        props: {},
        config: {},
      },
    ],
  },
} as const;

const PAGE_LIST = Object.values(CUSTOMER_PAGES).map((page) => ({
  id: page.id,
  name: page.name,
  display_order: page.display_order,
  icon_name: page.icon_name,
}));

export const SAMPLE_LEAD = {
  id: 9001,
  created_at: '2026-08-13T08:00:00Z',
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '9876543210',
  data: {
    name: 'Asha Rao',
    phone_number: '9876543210',
    lead_stage: 'New',
    company: 'North Wind',
  },
};

export async function mockCustomerFacingPages(page: Page) {
  await page.route((url) => url.pathname.includes('/rest/v1/pages'), async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: JSON_HEADERS });
      return;
    }

    const url = new URL(route.request().url());
    const accept = route.request().headers()['accept'] || '';
    const idFilter = url.searchParams.get('id');
    const id = idFilter?.startsWith('eq.') ? idFilter.slice(3) : null;

    if (id) {
      const found = Object.values(CUSTOMER_PAGES).find((item) => item.id === id);
      if (!found) {
        await route.fulfill({ status: 406, headers: JSON_HEADERS, json: { message: 'not found' } });
        return;
      }
      const row = {
        id: found.id,
        name: found.name,
        config: found.config,
        header_title: found.header_title,
        tenant_id: QA_TENANT.id,
        is_deleted: false,
      };
      await fulfillJson(route, accept.includes('vnd.pgrst.object') ? row : [row]);
      return;
    }

    await fulfillJson(route, PAGE_LIST);
  });
}

export async function mockNextLead(page: Page, lead: Record<string, unknown> | null = SAMPLE_LEAD) {
  await page.route('**/crm-records/get-next-lead/**', (route) =>
    fulfillJson(route, lead ?? {}),
  );
}

export function customerPagePath(pageKey: keyof typeof CUSTOMER_PAGES) {
  return `/app/${QA_TENANT.slug}/pages/${CUSTOMER_PAGES[pageKey].id}`;
}

export async function openCustomerApp(page: Page, path = customerPagePath('pendingLeads')) {
  await mockSupabaseAuth(page, 'accept-login');
  await mockBackendApis(page);
  await mockCustomerFacingPages(page);
  await seedBrowserSession(page);
  await page.goto(path);
}
