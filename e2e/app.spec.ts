import { expect, test } from '@playwright/test';
import { openLoggedIn } from './helpers/mocks';

test.describe('Authenticated app shell', () => {
  test('shows the dashboard and sidebar', async ({ page }) => {
    await openLoggedIn(page, '/');

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Welcome to your dashboard!')).toBeVisible();
    await expect(page.getByText('BOB by Pyro').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Pages' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Entity Types' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Background Jobs' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add User' })).toBeVisible();
  });

  test('opens My Pages from the sidebar', async ({ page }) => {
    await openLoggedIn(page, '/');
    await page.getByRole('link', { name: 'My Pages' }).click();

    await expect(page).toHaveURL(/\/pages$/);
    await expect(page.getByRole('heading', { name: 'My Pages' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Create New Page/ })).toBeVisible();
  });

  test('opens Entity Types', async ({ page }) => {
    await openLoggedIn(page, '/entity-types');

    await expect(page.getByRole('heading', { name: 'Entity Types' })).toBeVisible();
    await expect(page.getByText('Discovered entity schemas for the current tenant.')).toBeVisible();
  });

  test('opens Add User', async ({ page }) => {
    await openLoggedIn(page, '/add-user');
    await expect(page.getByRole('heading', { name: 'Add User' })).toBeVisible();
  });

  test('opens Billing', async ({ page }) => {
    await openLoggedIn(page, '/billing');
    await expect(page.getByRole('heading', { name: 'Billing', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Billing Inputs' })).toBeVisible();
  });

  test('opens Background Jobs for an admin role', async ({ page }) => {
    await openLoggedIn(page, '/background-jobs');
    await expect(page.getByRole('heading', { name: 'Background Jobs' })).toBeVisible();
    await expect(page.getByText(/Run any registered background job/)).toBeVisible();
  });

  test('opens Pyro Jobs for an admin role', async ({ page }) => {
    await openLoggedIn(page, '/pyro-jobs');
    await expect(page.getByRole('heading', { name: 'Pyro Jobs' })).toBeVisible();
  });

  test('opens profile from the user menu', async ({ page }) => {
    await openLoggedIn(page, '/');
    await page.getByRole('button').filter({ hasText: 'QA User' }).click();
    await page.getByRole('menuitem').filter({ hasText: 'Profile' }).click();

    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  });

  test('logs out from the user menu', async ({ page }) => {
    await openLoggedIn(page, '/');
    await page.getByRole('button').filter({ hasText: 'QA User' }).click();
    await page.getByRole('menuitem').filter({ hasText: 'Logout' }).click();

    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  });
});
