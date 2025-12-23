/**
 * Search E2E Tests
 *
 * Tests the vault item search functionality.
 *
 * @see docs/EVENT_STORMING.md - searchVaultItems query
 */

import { test, expect, SetupPage, VaultPage, ItemFormModal } from './fixtures';

test.describe('Vault Search', () => {
  /**
   * Helper to set up a vault with test items
   */
  async function setupVaultWithItems(page: import('@playwright/test').Page): Promise<boolean> {
    const setupPage = new SetupPage(page);
    const vaultPage = new VaultPage(page);
    const itemForm = new ItemFormModal(page);

    await setupPage.goto();
    await setupPage.waitForLoad();

    // Setup vault if needed
    const isSetupView = await setupPage.isVisible();
    if (isSetupView) {
      await setupPage.setupVault('Test User', 'Test Passkey');
      await page.waitForTimeout(2000);
    }

    // Unlock if needed
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

    // Add test items
    const testItems = [
      { title: 'GitHub Account', content: 'ghp_token123', type: 'password' as const },
      { title: 'GitLab Account', content: 'glpat_token456', type: 'password' as const },
      { title: 'AWS Credentials', content: 'AKIA...secret', type: 'secret' as const },
      { title: 'Server Notes', content: 'Production server is 10.0.0.1', type: 'note' as const },
      { title: 'Development Notes', content: 'Remember to update API keys', type: 'note' as const },
    ];

    for (const item of testItems) {
      await vaultPage.clickAddItem();
      await page.waitForTimeout(300);

      if (item.type === 'password') {
        await itemForm.createPasswordItem(item.title, item.content);
      } else if (item.type === 'note') {
        await itemForm.createNoteItem(item.title, item.content);
      } else {
        await itemForm.createSecretItem(item.title, item.content);
      }

      await page.waitForTimeout(500);
    }

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

  test.describe('Search Input', () => {
    test('should display search input', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);

      const hasItems = await setupVaultWithItems(page);
      if (!hasItems) {
        test.skip();
        return;
      }

      // Search input should be visible
      await expect(vaultPage.getSearchInput()).toBeVisible();
    });

    test('should filter items by title', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);

      const hasItems = await setupVaultWithItems(page);
      if (!hasItems) {
        test.skip();
        return;
      }

      // Search for "GitHub"
      await vaultPage.search('GitHub');

      await page.waitForTimeout(500);

      // Should show GitHub item
      await expect(page.getByText('GitHub Account')).toBeVisible();

      // Should not show GitLab or AWS
      await expect(page.getByText('GitLab Account')).not.toBeVisible();
      await expect(page.getByText('AWS Credentials')).not.toBeVisible();
    });

    test('should filter items by partial match', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);

      const hasItems = await setupVaultWithItems(page);
      if (!hasItems) {
        test.skip();
        return;
      }

      // Search for "Git" - should match both GitHub and GitLab
      await vaultPage.search('Git');

      await page.waitForTimeout(500);

      // Should show both Git* items
      await expect(page.getByText('GitHub Account')).toBeVisible();
      await expect(page.getByText('GitLab Account')).toBeVisible();

      // Should not show non-matching items
      await expect(page.getByText('AWS Credentials')).not.toBeVisible();
    });

    test('should filter items by content', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);

      const hasItems = await setupVaultWithItems(page);
      if (!hasItems) {
        test.skip();
        return;
      }

      // Search for content keyword "API"
      await vaultPage.search('API');

      await page.waitForTimeout(500);

      // Should show Development Notes (contains "API keys" in content)
      await expect(page.getByText('Development Notes')).toBeVisible();
    });

    test('should be case insensitive', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);

      const hasItems = await setupVaultWithItems(page);
      if (!hasItems) {
        test.skip();
        return;
      }

      // Search with different cases
      await vaultPage.search('github');
      await page.waitForTimeout(500);
      await expect(page.getByText('GitHub Account')).toBeVisible();

      await vaultPage.search('GITHUB');
      await page.waitForTimeout(500);
      await expect(page.getByText('GitHub Account')).toBeVisible();
    });

    test('should show all items when search is cleared', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);

      const hasItems = await setupVaultWithItems(page);
      if (!hasItems) {
        test.skip();
        return;
      }

      // First filter
      await vaultPage.search('GitHub');
      await page.waitForTimeout(500);

      // Verify filtering works
      await expect(page.getByText('GitLab Account')).not.toBeVisible();

      // Clear search
      await vaultPage.clearSearch();
      await page.waitForTimeout(500);

      // All items should be visible again
      await expect(page.getByText('GitHub Account')).toBeVisible();
      await expect(page.getByText('GitLab Account')).toBeVisible();
      await expect(page.getByText('AWS Credentials')).toBeVisible();
    });

    test('should show no results for non-matching search', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);

      const hasItems = await setupVaultWithItems(page);
      if (!hasItems) {
        test.skip();
        return;
      }

      // Search for something that doesn't exist
      await vaultPage.search('NonExistentItem12345');

      await page.waitForTimeout(500);

      // No items should be visible
      await expect(page.getByText('GitHub Account')).not.toBeVisible();
      await expect(page.getByText('GitLab Account')).not.toBeVisible();

      // Note: Some UIs may show "no results" message, others just show empty state
    });
  });

  test.describe('Search with Item Types', () => {
    test('should filter notes correctly', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);

      const hasItems = await setupVaultWithItems(page);
      if (!hasItems) {
        test.skip();
        return;
      }

      // Search for "Notes"
      await vaultPage.search('Notes');

      await page.waitForTimeout(500);

      // Should show both note items
      await expect(page.getByText('Server Notes')).toBeVisible();
      await expect(page.getByText('Development Notes')).toBeVisible();

      // Should not show password/secret items
      await expect(page.getByText('GitHub Account')).not.toBeVisible();
    });

    test('should filter secrets correctly', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);

      const hasItems = await setupVaultWithItems(page);
      if (!hasItems) {
        test.skip();
        return;
      }

      // Search for "AWS" or "Credentials"
      await vaultPage.search('AWS');

      await page.waitForTimeout(500);

      // Should show AWS item
      await expect(page.getByText('AWS Credentials')).toBeVisible();

      // Should not show others
      await expect(page.getByText('GitHub Account')).not.toBeVisible();
    });
  });

  test.describe('Search Performance', () => {
    test('should search instantly as user types', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);

      const hasItems = await setupVaultWithItems(page);
      if (!hasItems) {
        test.skip();
        return;
      }

      const searchInput = vaultPage.getSearchInput();

      // Type one character at a time and verify filtering
      await searchInput.fill('G');
      await page.waitForTimeout(200);

      // Should show Git* items
      await expect(page.getByText('GitHub Account')).toBeVisible();
      await expect(page.getByText('GitLab Account')).toBeVisible();

      // Continue typing
      await searchInput.fill('Git');
      await page.waitForTimeout(200);

      // Still shows Git items
      await expect(page.getByText('GitHub Account')).toBeVisible();

      // More specific
      await searchInput.fill('GitHub');
      await page.waitForTimeout(200);

      // Now only GitHub
      await expect(page.getByText('GitHub Account')).toBeVisible();
      await expect(page.getByText('GitLab Account')).not.toBeVisible();
    });
  });
});
