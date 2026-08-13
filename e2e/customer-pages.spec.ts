import { expect, test } from '@playwright/test';
import { QA_TENANT } from './helpers/fakes';
import {
  CUSTOMER_PAGES,
  SAMPLE_LEAD,
  customerPagePath,
  mockNextLead,
  openCustomerApp,
} from './helpers/customerPages';

test.describe('Customer-facing tenant pages', () => {
  test('sidebar lists Pending Leads, Pending Tickets, and Create Request', async ({ page }) => {
    await openCustomerApp(page);

    await expect(page.getByRole('link', { name: 'Pending Leads' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pending Tickets' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create Request' })).toBeVisible();
  });

  test('Pending Leads shows the idle queue and can fetch a lead', async ({ page }) => {
    await openCustomerApp(page, customerPagePath('pendingLeads'));

    await expect(page.getByRole('heading', { name: 'Pending Leads' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pending Fresh Leads' })).toBeVisible();
    await expect(page.getByText('Fresh leads remaining today')).toBeVisible();
    await expect(page.getByText('in North Zone')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get Leads' })).toBeVisible();

    await mockNextLead(page, SAMPLE_LEAD);
    await page.getByRole('button', { name: 'Get Leads' }).click();

    await expect(page.getByText('Asha Rao')).toBeVisible();
    await expect(page.getByText('9876543210')).toBeVisible();
  });

  test('Pending Tickets shows today’s queue and Get Tickets', async ({ page }) => {
    await openCustomerApp(page, customerPagePath('pendingTickets'));

    await expect(page.getByRole('heading', { name: 'Pending Tickets' })).toBeVisible();
    await expect(page.getByRole('heading', { name: "Today's Tickets" })).toBeVisible();
    await expect(page.getByText('Click to start working on tickets')).toBeVisible();
    await expect(page.getByText('Resolved Today')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get Tickets' })).toBeEnabled();
  });

  test('Create Request shows the customer request form', async ({ page }) => {
    await openCustomerApp(page, customerPagePath('createRequest'));

    await expect(page.getByRole('heading', { name: 'Create Request' })).toBeVisible();
    await expect(page.getByText('Project', { exact: false }).first()).toBeVisible();
    await expect(page.getByPlaceholder('Describe the item')).toBeVisible();
    await expect(page.getByPlaceholder('e.g. 560001')).toBeVisible();
    await expect(page.getByRole('button', { name: /Create Request/ })).toBeEnabled();
  });

  test('navigates between the three customer pages from the sidebar', async ({ page }) => {
    await openCustomerApp(page, customerPagePath('pendingLeads'));

    await page.getByRole('link', { name: 'Pending Tickets' }).click();
    await expect(page).toHaveURL(new RegExp(`/app/${QA_TENANT.slug}/pages/${CUSTOMER_PAGES.pendingTickets.id}`));
    await expect(page.getByRole('button', { name: 'Get Tickets' })).toBeVisible();

    await page.getByRole('link', { name: 'Create Request' }).click();
    await expect(page).toHaveURL(new RegExp(`/app/${QA_TENANT.slug}/pages/${CUSTOMER_PAGES.createRequest.id}`));
    await expect(page.getByRole('button', { name: /Create Request/ })).toBeVisible();

    await page.getByRole('link', { name: 'Pending Leads' }).click();
    await expect(page.getByRole('button', { name: 'Get Leads' })).toBeVisible();
  });
});
