import { expect, test } from '@playwright/test';
import { QA_TENANT } from './helpers/fakes';
import { CUSTOMER_PAGES, customerPagePath, openCustomerApp, type SidebarGrouping } from './helpers/customerPages';

const SUPPORT_GROUP: SidebarGrouping = {
  pendingLeads: { group: 'Support', section: 'Queues' },
  pendingTickets: { group: 'Support', section: 'Queues' },
};

test.describe('Grouped sidebar', () => {
  test('a group starts closed on another page and opens on click', async ({ page }) => {
    await openCustomerApp(page, customerPagePath('createRequest'), SUPPORT_GROUP);

    const group = page.getByRole('button', { name: 'Support' });
    await expect(group).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('link', { name: 'Create Request' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pending Leads' })).toHaveCount(0);

    await group.click();
    await expect(group).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('Queues')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pending Leads' })).toBeVisible();

    await page.getByRole('link', { name: 'Pending Tickets' }).click();
    await expect(page).toHaveURL(new RegExp(`/app/${QA_TENANT.slug}/pages/${CUSTOMER_PAGES.pendingTickets.id}`));
    await expect(group).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: 'Get Tickets' })).toBeVisible();
  });

  test('a direct link to a grouped page opens its group and renders the page', async ({ page }) => {
    await openCustomerApp(page, customerPagePath('pendingLeads'), SUPPORT_GROUP);

    await expect(page.getByRole('button', { name: 'Support' })).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('link', { name: 'Pending Leads' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get Leads' })).toBeVisible();
  });
});
