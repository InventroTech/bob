import { expect, test } from '@playwright/test';
import { mockSupabaseAuth } from './helpers/mocks';

const protectedPaths = [
  '/',
  '/pages',
  '/settings',
  '/add-user',
  '/entity-types',
  '/billing',
  '/background-jobs',
  '/pyro-jobs',
];

test.describe('Route guards', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page, 'reject-login');
  });

  for (const path of protectedPaths) {
    test(`redirects ${path} to /auth when logged out`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/auth$/);
      await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    });
  }

  test('redirects tenant app home to tenant login', async ({ page }) => {
    await page.goto('/app/acme');
    await expect(page).toHaveURL(/\/app\/acme\/login$/);
    await expect(page.getByRole('heading', { name: 'Login to Your App' })).toBeVisible();
  });
});

test.describe('Not found', () => {
  test('renders 404 for an unknown path', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByText('Oops! Page not found')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Return to Home' })).toHaveAttribute('href', '/');
  });
});
