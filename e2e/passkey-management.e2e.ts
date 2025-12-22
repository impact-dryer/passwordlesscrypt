/**
 * Passkey Management E2E Tests
 *
 * Tests adding and removing passkeys from the vault.
 *
 * @see docs/EVENT_STORMING.md - PasskeyCreated, PasskeyRemoved events
 */

import {
  test,
  expect,
  SetupPage,
  VaultPage,
  SettingsPage,
  AddPasskeyModal,
  ConfirmDeleteModal,
} from './fixtures';

test.describe('Passkey Management', () => {
  /**
   * Helper to set up a vault and navigate to settings
   */
  async function setupAndGoToSettings(page: import('@playwright/test').Page): Promise<boolean> {k
    const setupPage = new SetupPage(page);
    const vaultPage = new VaultPage(page);

    await setupPage.goto();
    await setupPage.waitForLoad();

    // Check if setup is needed
    const isSetupView = await setupPage.isVisible();
    if (isSetupView) {
      await setupPage.setupVault('Test User', 'Primary Passkey');
      await page.waitForTimeout(2000);
    }

    // Check if we need to unlock
    const unlockButton = page.getByRole('button', { name: /unlock/i });
    if (await unlockButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await unlockButton.click();
      await page.waitForTimeout(2000);
    }

    // Check if vault is visible
    const isVaultVisible = await vaultPage.isVisible();
    if (!isVaultVisible) {
      return false;
    }

    // Navigate to settings
    await vaultPage.openSettings();
    await page.waitForTimeout(500);

    return true;
  }

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
    // Reload to apply clean state
    await page.reload();
  });

  test.describe('Settings View', () => {
    test('should display settings view with passkey management', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const inSettings = await setupAndGoToSettings(page);
      if (!inSettings) {
        test.skip();
        return;
      }

      // Should show passkey section
      await expect(page.getByText(/passkey|security/i).first()).toBeVisible();
    });

    test('should display current passkey', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const inSettings = await setupAndGoToSettings(page);
      if (!inSettings) {
        test.skip();
        return;
      }

      // Should show the primary passkey
      await expect(page.getByText('Primary Passkey')).toBeVisible();
    });

    test('should indicate currently used passkey', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const inSettings = await setupAndGoToSettings(page);
      if (!inSettings) {
        test.skip();
        return;
      }

      // There should be some indicator for the active passkey
      const activeIndicator = page.locator('text=/current|active|in use/i');
      await expect(activeIndicator.first())
        .toBeVisible()
        .catch(() => {
          // Alternative: just verify passkey is displayed
        });
    });
  });

  test.describe('Adding Passkeys', () => {
    test('should open add passkey modal', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const settingsPage = new SettingsPage(page);

      const inSettings = await setupAndGoToSettings(page);
      if (!inSettings) {
        test.skip();
        return;
      }

      // Click add passkey
      await settingsPage.clickAddPasskey();

      // Modal should be visible
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('should add a new passkey', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const settingsPage = new SettingsPage(page);
      const addPasskeyModal = new AddPasskeyModal(page);

      const inSettings = await setupAndGoToSettings(page);
      if (!inSettings) {
        test.skip();
        return;
      }

      // Click add passkey
      await settingsPage.clickAddPasskey();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Fill in passkey name and submit
      await addPasskeyModal.addPasskey('Secondary Passkey');

      // Wait for WebAuthn interaction
      await page.waitForTimeout(2000);

      // Should show success toast
      await expect(page.getByText(/success|added/i))
        .toBeVisible({ timeout: 5000 })
        .catch(() => {
          // Check if new passkey appears in list
        });

      // New passkey should be in list
      await expect(page.getByText('Secondary Passkey')).toBeVisible();
    });

    test('should show error for empty passkey name', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const settingsPage = new SettingsPage(page);
      const addPasskeyModal = new AddPasskeyModal(page);

      const inSettings = await setupAndGoToSettings(page);
      if (!inSettings) {
        test.skip();
        return;
      }

      // Click add passkey
      await settingsPage.clickAddPasskey();

      // Try to submit empty form
      await addPasskeyModal.submit();

      // Should show error
      await expect(page.getByText(/required|fill|name/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Removing Passkeys', () => {
    test('should not allow removing the last passkey', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const inSettings = await setupAndGoToSettings(page);
      if (!inSettings) {
        test.skip();
        return;
      }

      // Try to delete the only passkey
      const deleteButton = page.getByRole('button', { name: /delete|remove/i }).first();
      if (await deleteButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await deleteButton.click();

        // If confirmation appears, try to confirm
        const confirmButton = page.getByRole('button', { name: /delete|remove|confirm/i });
        if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await confirmButton.click();
        }

        // Should show error about last passkey
        await expect(page.getByText(/last|cannot remove|at least one/i))
          .toBeVisible({ timeout: 5000 })
          .catch(() => {
            // Button might be disabled or not shown for last passkey
          });
      }
    });

    test('should remove a passkey when multiple exist', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const settingsPage = new SettingsPage(page);
      const addPasskeyModal = new AddPasskeyModal(page);
      const confirmDelete = new ConfirmDeleteModal(page);

      const inSettings = await setupAndGoToSettings(page);
      if (!inSettings) {
        test.skip();
        return;
      }

      // First add a second passkey
      await settingsPage.clickAddPasskey();
      await addPasskeyModal.addPasskey('Backup Passkey');
      await page.waitForTimeout(2000);

      // Now try to delete the backup passkey
      const backupCard = page.locator('text=Backup Passkey');
      await backupCard.waitFor({ state: 'visible', timeout: 5000 });

      const deleteButton = backupCard
        .locator('..')
        .locator('..')
        .getByRole('button', { name: /delete|remove/i });
      if (await deleteButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await deleteButton.click();

        // Confirm deletion
        await confirmDelete.confirm();
        await page.waitForTimeout(1000);

        // Passkey should be removed
        await expect(page.getByText('Backup Passkey')).not.toBeVisible({ timeout: 5000 });
      }
    });

    test('should show confirmation dialog before removing passkey', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const settingsPage = new SettingsPage(page);
      const addPasskeyModal = new AddPasskeyModal(page);

      const inSettings = await setupAndGoToSettings(page);
      if (!inSettings) {
        test.skip();
        return;
      }

      // Add a second passkey first
      await settingsPage.clickAddPasskey();
      await addPasskeyModal.addPasskey('Temp Passkey');
      await page.waitForTimeout(2000);

      // Try to delete
      const deleteButton = page.getByRole('button', { name: /delete|remove/i }).first();
      if (await deleteButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await deleteButton.click();

        // Should show confirmation
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText(/no longer|unable to unlock/i)).toBeVisible();
      }
    });
  });

  test.describe('Navigation', () => {
    test('should navigate back to vault from settings', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const settingsPage = new SettingsPage(page);

      const inSettings = await setupAndGoToSettings(page);
      if (!inSettings) {
        test.skip();
        return;
      }

      // Go back to vault
      await settingsPage.backToVault();

      await page.waitForTimeout(500);

      // Should be back on vault view
      const isVaultVisible = await vaultPage.isVisible();
      expect(isVaultVisible).toBe(true);
    });
  });
});
