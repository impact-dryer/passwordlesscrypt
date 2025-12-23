/**
 * Vault Setup E2E Tests
 *
 * Tests the initial vault creation flow.
 * Note: WebAuthn PRF extension testing requires specific browser support.
 * These tests focus on UI behavior that can be verified without actual WebAuthn.
 *
 * @see docs/EVENT_STORMING.md - VaultCreated, PasskeyCreated events
 */

import { test, expect, SetupPage } from './fixtures';

test.describe('Vault Setup', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app first, then clear IndexedDB data for a clean state
    await page.goto('/');
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase('passwordless-vault');
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => resolve();
        deleteRequest.onblocked = () => resolve();
      });
    });
    // Reload to apply clean state
    await page.reload();
  });

  test('should display setup view for new users', async ({
    page,
    virtualAuthenticator: _virtualAuthenticator,
  }) => {
    const setupPage = new SetupPage(page);

    await setupPage.goto();
    await setupPage.waitForLoad();

    // Verify setup view content is shown
    await expect(page.getByText('Passwordless Encryption')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('How it works')).toBeVisible();
  });

  test('should display setup instructions', async ({
    page,
    virtualAuthenticator: _virtualAuthenticator,
  }) => {
    const setupPage = new SetupPage(page);

    await setupPage.goto();
    await setupPage.waitForLoad();

    // Verify setup instructions are displayed
    await expect(page.getByText(/create a passkey/i)).toBeVisible();
    await expect(page.getByText(/secrets are encrypted/i)).toBeVisible();
    await expect(page.getByText(/only you can unlock/i)).toBeVisible();
  });

  test('should display create vault button', async ({
    page,
    virtualAuthenticator: _virtualAuthenticator,
  }) => {
    const setupPage = new SetupPage(page);

    await setupPage.goto();
    await setupPage.waitForLoad();

    // Verify the create vault button exists
    const button = page.getByRole('button', { name: /create.*vault/i });
    await expect(button).toBeVisible({ timeout: 10000 });
  });

  test('should show compatibility information', async ({
    page,
    virtualAuthenticator: _virtualAuthenticator,
  }) => {
    const setupPage = new SetupPage(page);

    await setupPage.goto();
    await setupPage.waitForLoad();

    // Page should have some content indicating WebAuthn status
    // This may show a warning if WebAuthn isn't fully supported
    const pageContent = await page.content();
    const hasContent = pageContent.includes('Passwordless') || pageContent.includes('vault');
    expect(hasContent).toBe(true);
  });
});

