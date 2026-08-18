import { expect, test } from '@playwright/test';
import { mockBackendApis, mockSupabaseAuth } from './helpers/mocks';

test.describe('Admin sign in', () => {
  test('shows the sign-in form', async ({ page }) => {
    await mockSupabaseAuth(page, 'reject-login');
    await page.goto('/auth');

    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.locator('#signin-password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeEnabled();
  });

  test('blocks submit when email is empty', async ({ page }) => {
    await mockSupabaseAuth(page, 'reject-login');
    await page.goto('/auth');

    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.locator('#signin-email:invalid')).toHaveCount(1);
    await expect(page).toHaveURL(/\/auth/);
  });

  test('toggles password visibility', async ({ page }) => {
    await mockSupabaseAuth(page, 'reject-login');
    await page.goto('/auth');

    const password = page.locator('#signin-password');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('shows an error for invalid credentials', async ({ page }) => {
    await mockSupabaseAuth(page, 'reject-login');
    await page.goto('/auth');

    await page.getByLabel('Email Address').fill('nobody@pyro.test');
    await page.locator('#signin-password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid login credentials')).toBeVisible();
    await expect(page).toHaveURL(/\/auth/);
  });

  test('signs in and lands on the dashboard', async ({ page }) => {
    await mockSupabaseAuth(page, 'accept-login');
    await mockBackendApis(page);
    await page.goto('/auth');

    await page.getByLabel('Email Address').fill('qa@pyro.test');
    await page.locator('#signin-password').fill('correct-horse');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Welcome to your dashboard!')).toBeVisible();
  });
});

test.describe('Sign up', () => {
  test('shows the form and a link back to sign in', async ({ page }) => {
    await mockSupabaseAuth(page, 'signup-confirm-email');
    await page.goto('/signup');

    await expect(page.getByRole('heading', { name: 'Sign Up' })).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByLabel('Organization slug')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth');
  });

  test('asks the user to confirm email after signup', async ({ page }) => {
    await mockSupabaseAuth(page, 'signup-confirm-email');
    await page.goto('/signup');

    await page.getByLabel('Email Address').fill('new@pyro.test');
    await page.getByLabel('Password').fill('secret123');
    await page.getByLabel('Organization slug').fill('new-org');
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await expect(page.getByText('Check your email for the confirmation link.')).toBeVisible();
  });
});

test.describe('Forgot password', () => {
  test('sends a reset code', async ({ page }) => {
    await mockBackendApis(page);
    await page.goto('/auth/forgot-password');

    await expect(page.getByRole('heading', { name: 'Forgot password' })).toBeVisible();
    await page.getByLabel('Email address').fill('qa@pyro.test');
    await page.getByRole('button', { name: 'Send code' }).click();

    await expect(page.getByText(/If an account exists for that email/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/auth');
  });

  test('shows an API error', async ({ page }) => {
    await mockBackendApis(page);
    await page.route('**/auth/forgot-password/**', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Mailer is down' }),
      }),
    );
    await page.goto('/auth/forgot-password');

    await page.getByLabel('Email address').fill('qa@pyro.test');
    await page.getByRole('button', { name: 'Send code' }).click();
    await expect(page.getByText('Mailer is down')).toBeVisible();
  });
});

test.describe('Reset password', () => {
  test('validates the 6-digit code', async ({ page }) => {
    await mockBackendApis(page);
    await page.goto('/auth/reset-password?email=qa%40pyro.test');

    await expect(page.getByRole('heading', { name: 'Reset password' })).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveValue('qa@pyro.test');

    await page.locator('#reset-otp').fill('12');
    await page.locator('#reset-password').fill('newpass1');
    await page.locator('#reset-confirm').fill('newpass1');
    await page.getByRole('button', { name: 'Update password' }).click();

    await expect(page.locator('#reset-otp:invalid')).toHaveCount(1);
  });

  test('rejects mismatched passwords', async ({ page }) => {
    await mockBackendApis(page);
    await page.goto('/auth/reset-password');

    await page.getByLabel('Email').fill('qa@pyro.test');
    await page.getByLabel('6-digit code').fill('123456');
    await page.locator('#reset-password').fill('newpass1');
    await page.locator('#reset-confirm').fill('different');
    await page.getByRole('button', { name: 'Update password' }).click();

    await expect(page.getByText('Passwords do not match.')).toBeVisible();
  });

  test('updates the password and returns to sign in', async ({ page }) => {
    await mockBackendApis(page);
    await page.goto('/auth/reset-password');

    await page.getByLabel('Email').fill('qa@pyro.test');
    await page.getByLabel('6-digit code').fill('123456');
    await page.locator('#reset-password').fill('newpass1');
    await page.locator('#reset-confirm').fill('newpass1');
    await page.getByRole('button', { name: 'Update password' }).click();

    await expect(page.getByText(/Your password has been updated/)).toBeVisible();
    await expect(page).toHaveURL(/\/auth$/);
  });
});

test.describe('Tenant app login', () => {
  test('shows sign-in and sign-up tabs', async ({ page }) => {
    await mockSupabaseAuth(page, 'reject-login');
    await page.goto('/app/acme/login');

    await expect(page.getByRole('heading', { name: 'Login to Your App' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Sign up' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute(
      'href',
      '/app/acme/auth/forgot-password',
    );
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  });

  test('rejects mismatched signup passwords', async ({ page }) => {
    await mockSupabaseAuth(page, 'signup-confirm-email');
    await page.goto('/app/acme/login');

    await page.getByRole('tab', { name: 'Sign up' }).click();
    await page.getByPlaceholder('you@example.com').fill('qa@pyro.test');
    await page.getByPlaceholder('Minimum 6 characters').fill('secret1');
    await page.getByPlaceholder('Re-enter password').fill('secret2');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Passwords do not match.')).toBeVisible();
  });
});
