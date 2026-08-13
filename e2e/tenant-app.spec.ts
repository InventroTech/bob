import { expect, test } from '@playwright/test';
import { QA_TENANT } from './helpers/fakes';
import { mockBackendApis, mockSupabaseAuth, openLoggedIn } from './helpers/mocks';

test.describe('Tenant app', () => {
  test('signs in and lands on the tenant dashboard', async ({ page }) => {
    await mockSupabaseAuth(page, 'accept-login');
    await mockBackendApis(page);
    await page.goto(`/app/${QA_TENANT.slug}/login`);

    await page.getByPlaceholder('you@example.com').fill('qa@pyro.test');
    await page.getByPlaceholder('••••••••').fill('correct-horse');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page).toHaveURL(new RegExp(`/app/${QA_TENANT.slug}$`));
    await expect(page.getByRole('heading', { name: `Welcome to ${QA_TENANT.slug}` })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("You don't have any pages yet.")).toBeVisible();
    await expect(page.getByText('User: qa@pyro.test')).toBeVisible();
  });

  test('shows the empty-state dashboard when already logged in', async ({ page }) => {
    await openLoggedIn(page, `/app/${QA_TENANT.slug}`);

    await expect(page.getByRole('heading', { name: `Welcome to ${QA_TENANT.slug}` })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Contact your administrator to create pages for your account.')).toBeVisible();
  });
});
