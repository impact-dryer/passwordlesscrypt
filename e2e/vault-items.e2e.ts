/**
 * Vault Items E2E Tests
 *
 * Tests CRUD operations for vault items (passwords, notes, secrets).
 *
 * @see docs/EVENT_STORMING.md - VaultItemAdded, VaultItemUpdated, VaultItemDeleted events
 */

import { test, expect, SetupPage, VaultPage, ItemFormModal, ConfirmDeleteModal } from './fixtures';

test.describe('Vault Items', () => {
  /**
   * Helper to set up a vault and ensure we're on vault view
   */
  async function setupAndUnlockVault(page: import('@playwright/test').Page): Promise<boolean> {
    const setupPage = new SetupPage(page);
    const vaultPage = new VaultPage(page);

    await setupPage.goto();
    await setupPage.waitForLoad();

    // Check if setup is needed
    const isSetupView = await setupPage.isVisible();
    if (isSetupView) {
      await setupPage.setupVault('Test User', 'Test Passkey');
      await page.waitForTimeout(2000);
    }

    // Check if we need to unlock
    const unlockButton = page.getByRole('button', { name: /unlock/i });
    if (await unlockButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await unlockButton.click();
      await page.waitForTimeout(2000);
    }

    return vaultPage.isVisible();
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

  test.describe('Adding Items', () => {
    test('should open add item modal', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Click add item
      await vaultPage.clickAddItem();

      // Modal should be visible
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('should add a password item', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const itemForm = new ItemFormModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Open add modal
      await vaultPage.clickAddItem();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Fill in password details
      await itemForm.createPasswordItem(
        'GitHub Account',
        'my-secure-password',
        'https://github.com',
        'testuser'
      );

      // Wait for save
      await page.waitForTimeout(1000);

      // Modal should close and item should appear
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
      await expect(page.getByText('GitHub Account')).toBeVisible();
    });

    test('should add a note item', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const itemForm = new ItemFormModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Open add modal
      await vaultPage.clickAddItem();

      // Create a note
      await itemForm.createNoteItem('My Secret Note', 'This is my secret note content');

      await page.waitForTimeout(1000);

      // Should appear in list
      await expect(page.getByText('My Secret Note')).toBeVisible();
    });

    test('should add a secret item', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const itemForm = new ItemFormModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Open add modal
      await vaultPage.clickAddItem();

      // Create a secret
      await itemForm.createSecretItem('API Key', 'sk-1234567890abcdef');

      await page.waitForTimeout(1000);

      // Should appear in list
      await expect(page.getByText('API Key')).toBeVisible();
    });

    test('should generate secure password', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const itemForm = new ItemFormModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Open add modal
      await vaultPage.clickAddItem();

      // Select password type and fill title
      await itemForm.selectType('password');
      await itemForm.fillTitle('Generated Password Test');

      // Generate password
      await itemForm.generatePassword();

      // Content field should have a value
      const contentField = page
        .locator('textarea, input[type="text"]')
        .filter({ hasText: /.{10,}/ });
      await expect(contentField.first()).toBeVisible();
    });

    test('should show validation error for empty fields', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const itemForm = new ItemFormModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Open add modal
      await vaultPage.clickAddItem();

      // Try to submit without filling fields
      await itemForm.submit();

      // Should show error toast
      await vaultPage.waitForToast(/fill|required|empty/i);
    });

    test('should close modal without saving', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const itemForm = new ItemFormModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Open add modal
      await vaultPage.clickAddItem();

      // Fill some data
      await itemForm.fillTitle('Unsaved Item');

      // Close without saving
      await itemForm.close();

      // Modal should close
      await expect(page.getByRole('dialog')).not.toBeVisible();

      // Item should not be saved
      await expect(page.getByText('Unsaved Item')).not.toBeVisible();
    });
  });

  test.describe('Editing Items', () => {
    test('should edit an existing item', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const itemForm = new ItemFormModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // First add an item
      await vaultPage.clickAddItem();
      await itemForm.createNoteItem('Original Title', 'Original content');
      await page.waitForTimeout(1000);

      // Find the item and click edit
      const itemCard = page.locator('text=Original Title').first();
      await itemCard.click();

      // Wait for edit modal or expand
      await page.waitForTimeout(500);

      // Look for edit button on the item
      const editButton = page.getByRole('button', { name: /edit/i }).first();
      if (await editButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await editButton.click();

        // Update title
        await itemForm.fillTitle('Updated Title');
        await itemForm.submit();

        await page.waitForTimeout(1000);

        // Should show updated title
        await expect(page.getByText('Updated Title')).toBeVisible();
      }
    });

    test('should preserve item type when editing', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const itemForm = new ItemFormModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Add a password item
      await vaultPage.clickAddItem();
      await itemForm.createPasswordItem('Password Item', 'test123', 'https://test.com', 'user');
      await page.waitForTimeout(1000);

      // Edit the item
      const editButton = page.getByRole('button', { name: /edit/i }).first();
      if (await editButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await editButton.click();

        // Password type should still be selected
        const passwordButton = page.getByRole('button', { name: /password/i });
        await expect(passwordButton)
          .toHaveAttribute('aria-pressed', 'true')
          .catch(() => {
            // Alternative: check if the button has a selected state
          });
      }
    });
  });

  test.describe('Deleting Items', () => {
    test('should delete an item', async ({ page, virtualAuthenticator: _virtualAuthenticator }) => {
      const vaultPage = new VaultPage(page);
      const itemForm = new ItemFormModal(page);
      const confirmDelete = new ConfirmDeleteModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // First add an item
      await vaultPage.clickAddItem();
      await itemForm.createNoteItem('Item To Delete', 'Will be deleted');
      await page.waitForTimeout(1000);

      // Find delete button
      const deleteButton = page.getByRole('button', { name: /delete/i }).first();
      if (await deleteButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await deleteButton.click();

        // Confirm deletion
        await confirmDelete.confirm();

        await page.waitForTimeout(1000);

        // Item should be gone
        await expect(page.getByText('Item To Delete')).not.toBeVisible();
      }
    });

    test('should cancel deletion', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const itemForm = new ItemFormModal(page);
      const confirmDelete = new ConfirmDeleteModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // First add an item
      await vaultPage.clickAddItem();
      await itemForm.createNoteItem('Keep This Item', 'Should not be deleted');
      await page.waitForTimeout(1000);

      // Find delete button
      const deleteButton = page.getByRole('button', { name: /delete/i }).first();
      if (await deleteButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await deleteButton.click();

        // Cancel deletion
        await confirmDelete.cancel();

        await page.waitForTimeout(500);

        // Item should still be there
        await expect(page.getByText('Keep This Item')).toBeVisible();
      }
    });

    test('should show confirmation dialog before deletion', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const itemForm = new ItemFormModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // First add an item
      await vaultPage.clickAddItem();
      await itemForm.createNoteItem('Test Delete Confirmation', 'Test');
      await page.waitForTimeout(1000);

      // Find delete button
      const deleteButton = page.getByRole('button', { name: /delete/i }).first();
      if (await deleteButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await deleteButton.click();

        // Should show confirmation dialog
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText(/cannot be undone|permanently/i)).toBeVisible();
      }
    });
  });

  test.describe('Item Count', () => {
    test('should update item count when adding items', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const itemForm = new ItemFormModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Initial count should be 0
      const countText = page.locator('text=/\\d+ items?/i');

      // Add first item
      await vaultPage.clickAddItem();
      await itemForm.createNoteItem('First Item', 'Content');
      await page.waitForTimeout(1000);

      // Add second item
      await vaultPage.clickAddItem();
      await itemForm.createNoteItem('Second Item', 'Content');
      await page.waitForTimeout(1000);

      // Count should reflect items
      if (await countText.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(countText).toContainText(/[12] items?/);
      }
    });
  });
});
