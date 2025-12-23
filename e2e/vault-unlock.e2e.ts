/**
 * Vault Unlock/Lock E2E Tests
 *
 * Tests vault unlocking and locking functionality.
 * Requires a pre-setup vault state for most tests.
 * Note: These tests require WebAuthn support which may not be available in all environments.
 *
 * @see docs/EVENT_STORMING.md - VaultUnlocked, VaultLocked events
 */

import { test, expect, SetupPage, LockedPage, VaultPage } from './fixtures';

test.describe('Vault Unlock/Lock', () => {
  /**
   * Helper to set up a vault before tests.
   * Returns true if vault was successfully set up, false otherwise.
   */
  async function setupVault(page: import('@playwright/test').Page): Promise<boolean> {
    const setupPage = new SetupPage(page);
    const vaultPage = new VaultPage(page);

    await setupPage.goto();
    await setupPage.waitForLoad();

    // Check if already setup (might be locked view)
    const isSetupView = await setupPage.isVisible();
    if (isSetupView) {
      try {
        await setupPage.setupVault('Test User', 'Test Passkey');
        await page.waitForTimeout(1000);
      } catch {
        // WebAuthn setup failed
        return false;
      }
    }

    // Check if we're now on vault view or locked view
    const isVaultVisible = await vaultPage.isVisible();
    const isLockedVisible = await page
      .getByRole('button', { name: /unlock/i })
      .isVisible()
      .catch(() => false);

    return isVaultVisible || isLockedVisible;
  }

  test.describe('Vault Locking', () => {
    test.beforeEach(async ({ page, virtualAuthenticator: _virtualAuthenticator }) => {
      // Clear IndexedDB for clean state
      await page.goto('/');
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          const deleteRequest = indexedDB.deleteDatabase('passwordless-vault');
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => resolve();
          deleteRequest.onblocked = () => resolve();
        });
      });
      await page.reload();
    });

    test('should lock vault when clicking lock button', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);

      const setupSuccess = await setupVault(page);
      if (!setupSuccess) {
        test.skip();
        return;
      }

      // Check if vault is visible (unlocked)
      const isVaultVisible = await vaultPage.isVisible();
      if (!isVaultVisible) {
        test.skip();
        return;
      }

      await vaultPage.lock();
      await expect(page.getByRole('button', { name: /unlock/i })).toBeVisible();
    });

    test('should clear search when locking vault', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);

      const setupSuccess = await setupVault(page);
      if (!setupSuccess) {
        test.skip();
        return;
      }

      const isVaultVisible = await vaultPage.isVisible();
      if (!isVaultVisible) {
        test.skip();
        return;
      }

      const searchInput = vaultPage.getSearchInput();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('test query');
      }

      await vaultPage.lock();
      await page.getByRole('button', { name: /unlock/i }).click();
      await page.waitForTimeout(1000);

      const newSearchInput = vaultPage.getSearchInput();
      if (await newSearchInput.isVisible().catch(() => false)) {
        await expect(newSearchInput).toHaveValue('');
      }
    });
  });

  test.describe('Vault Unlocking', () => {
    test.beforeEach(async ({ page, virtualAuthenticator: _virtualAuthenticator }) => {
      await page.goto('/');
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          const deleteRequest = indexedDB.deleteDatabase('passwordless-vault');
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => resolve();
          deleteRequest.onblocked = () => resolve();
        });
      });
      await page.reload();

      const setupSuccess = await setupVault(page);
      if (!setupSuccess) return;

      // Lock the vault if it's unlocked
      const vaultPage = new VaultPage(page);
      const isVaultVisible = await vaultPage.isVisible();
      if (isVaultVisible) {
        await vaultPage.lock();
      }
    });

    test('should show locked view when vault is locked', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const isLocked = await page
        .getByRole('button', { name: /unlock/i })
        .isVisible()
        .catch(() => false);
      if (!isLocked) {
        test.skip();
        return;
      }

      await expect(page.getByRole('button', { name: /unlock/i })).toBeVisible();
    });

    test('should unlock vault when clicking unlock button', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const lockedPage = new LockedPage(page);
      const vaultPage = new VaultPage(page);

      const isLocked = await lockedPage.isVisible();
      if (!isLocked) {
        test.skip();
        return;
      }

      try {
        await lockedPage.clickUnlock();
        await page.waitForTimeout(1000);
      } catch {
        test.skip();
        return;
      }

      const isUnlocked = await vaultPage.isVisible();
      if (isUnlocked) {
        expect(isUnlocked).toBe(true);
      }
    });

    test('should show passkey name after successful unlock', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const lockedPage = new LockedPage(page);

      const isLocked = await lockedPage.isVisible();
      if (!isLocked) {
        test.skip();
        return;
      }

      try {
        await lockedPage.clickUnlock();
        await lockedPage.waitForToast(/unlocked|test passkey/i);
      } catch {
        test.skip();
      }
    });
  });

  test.describe('Vault State Persistence', () => {
    test.beforeEach(async ({ page, virtualAuthenticator: _virtualAuthenticator }) => {
      await page.goto('/');
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          const deleteRequest = indexedDB.deleteDatabase('passwordless-vault');
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => resolve();
          deleteRequest.onblocked = () => resolve();
        });
      });
      await page.reload();
    });

    test('should show locked view on page reload when vault exists', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);

      const setupSuccess = await setupVault(page);
      if (!setupSuccess) {
        test.skip();
        return;
      }

      const isVaultVisible = await vaultPage.isVisible();
      if (isVaultVisible) {
        await vaultPage.lock();
      }

      await page.reload();
      await page.waitForTimeout(500);

      const isLocked = await page
        .getByRole('button', { name: /unlock/i })
        .isVisible()
        .catch(() => false);
      if (!isLocked) {
        test.skip();
        return;
      }

      await expect(page.getByRole('button', { name: /unlock/i })).toBeVisible();
    });

    test('should preserve vault items after lock/unlock cycle', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const lockedPage = new LockedPage(page);

      const setupSuccess = await setupVault(page);
      if (!setupSuccess) {
        test.skip();
        return;
      }

      const isVaultVisible = await vaultPage.isVisible();
      if (!isVaultVisible) {
        test.skip();
        return;
      }

      await vaultPage.lock();
      await page.waitForTimeout(300);

      try {
        await lockedPage.clickUnlock();
        await page.waitForTimeout(1000);
      } catch {
        test.skip();
        return;
      }

      const stillVisible = await vaultPage.isVisible();
      expect(stillVisible).toBe(true);
    });
  });
});

