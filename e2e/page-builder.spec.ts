import { expect, test } from '@playwright/test';
import { NEW_PAGE_ID, QA_TENANT } from './helpers/fakes';
import { openLoggedIn } from './helpers/mocks';

test.describe('Page builder', () => {
  test('opens Create New Page from My Pages', async ({ page }) => {
    await openLoggedIn(page, '/pages');

    await page.getByRole('link', { name: /Create New Page/ }).click();

    await expect(page).toHaveURL(/\/builder\/new$/);
    await expect(page.getByPlaceholder('Page Name')).toHaveValue('Untitled Page');
    await expect(page.getByRole('tab', { name: 'Components' })).toBeVisible();
    await expect(page.getByText('Layout Components')).toBeVisible();
    await expect(page.getByText('Drop components here')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  test('drops a container onto the canvas', async ({ page }) => {
    await openLoggedIn(page, '/builder/new');

    const paletteItem = page.locator('[data-component-type="container"]');
    const canvas = page.locator('#canvas-drop-area');
    await paletteItem.scrollIntoViewIfNeeded();
    await paletteItem.dragTo(canvas);

    await expect(page.getByText('Drop components here')).toHaveCount(0);
    await expect(page.getByText('Empty Container')).toBeVisible();
  });

  test('renames a page and saves', async ({ page }) => {
    await openLoggedIn(page, '/builder/new');

    await expect.poll(async () => page.evaluate(() => localStorage.getItem('tenant_slug'))).toBe(
      QA_TENANT.slug,
    );
    await expect(page.getByRole('combobox')).toContainText('Pyro Admin');

    await page.getByPlaceholder('Page Name').fill('Ops Home');
    await page.getByPlaceholder('Header Title').fill('Operations');

    const created = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname.replace(/\/+$/, '').endsWith('/pages'),
    );
    await page.getByRole('button', { name: 'Save' }).click();
    await created;

    await expect(page).toHaveURL(new RegExp(`/builder/${NEW_PAGE_ID}$`));
    await expect(page.getByPlaceholder('Page Name')).toHaveValue('Ops Home');
  });
});
