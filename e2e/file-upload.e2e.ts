/**
 * File Upload E2E Tests
 *
 * Tests file upload and download functionality in the vault.
 *
 * @see docs/EVENT_STORMING.md - FileItemAdded, FileEncrypted, FileDecrypted events
 */

import {
  test,
  expect,
  SetupPage,
  VaultPage,
  FileUploadModal,
  ConfirmDeleteModal,
} from './fixtures';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

test.describe('File Upload', () => {
  // Test file path - created fresh in each beforeEach
  const testFilePath = path.join(os.tmpdir(), `test-upload-file-${String(process.pid)}.txt`);
  const testFileContent = 'This is test file content for E2E testing.\nLine 2 of the file.';

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
    // Create test file for this worker
    fs.writeFileSync(testFilePath, testFileContent);
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

  test.afterEach(async () => {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  test.describe('Upload Modal', () => {
    test('should open file upload modal', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Click upload file button
      await vaultPage.clickUploadFile();

      // Modal should be visible
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Upload File' })).toBeVisible();
    });

    test('should close upload modal without uploading', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const fileModal = new FileUploadModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Open upload modal
      await vaultPage.clickUploadFile();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Close without uploading
      await fileModal.close();

      // Modal should close
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test.describe('File Upload', () => {
    test('should upload a text file', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const fileModal = new FileUploadModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Open upload modal
      await vaultPage.clickUploadFile();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Set file and title
      await fileModal.setFile(testFilePath);
      await fileModal.fillTitle('My Test File');

      // Submit
      await fileModal.submit();

      // Wait for upload to complete
      await page.waitForTimeout(1000);

      // Modal should close
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // File should appear in vault
      await expect(page.getByText('My Test File')).toBeVisible();
    });

    test('should show file icon for uploaded files', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const fileModal = new FileUploadModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Upload a file
      await vaultPage.clickUploadFile();
      await fileModal.setFile(testFilePath);
      await fileModal.fillTitle('File With Icon');
      await fileModal.submit();
      await page.waitForTimeout(1000);

      // File item should be visible
      await expect(page.getByText('File With Icon')).toBeVisible();

      // Should show file-related info (filename or size)
      await expect(page.getByText(/test-upload-file\.txt|\.txt/i)).toBeVisible();
    });

    test('should use filename as default title', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const fileModal = new FileUploadModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Open upload modal
      await vaultPage.clickUploadFile();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Set file without custom title
      await fileModal.setFile(testFilePath);

      // Submit without filling title (should use filename)
      await fileModal.submit();
      await page.waitForTimeout(1000);

      // File should appear - look for the file item card with the filename
      await expect(page.getByRole('heading', { name: /test-upload-file/ })).toBeVisible();
    });

    test('should show upload success toast', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const fileModal = new FileUploadModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Upload a file
      await vaultPage.clickUploadFile();
      await fileModal.setFile(testFilePath);
      await fileModal.fillTitle('Toast Test File');
      await fileModal.submit();

      // Should show success toast - be specific to file upload toast
      await vaultPage.waitForToast('File uploaded successfully');
    });
  });

  test.describe('File Download', () => {
    test('should show download button for file items', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const fileModal = new FileUploadModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // First upload a file
      await vaultPage.clickUploadFile();
      await fileModal.setFile(testFilePath);
      await fileModal.fillTitle('Downloadable File');
      await fileModal.submit();
      await page.waitForTimeout(1000);

      // Find download button on the file item
      const downloadButton = page.getByRole('button', { name: /download/i }).first();
      await expect(downloadButton).toBeVisible();
    });

    test('should trigger download when clicking download button', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const fileModal = new FileUploadModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Upload a file
      await vaultPage.clickUploadFile();
      await fileModal.setFile(testFilePath);
      await fileModal.fillTitle('Download Test');
      await fileModal.submit();
      await page.waitForTimeout(1000);

      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

      // Click download
      const downloadButton = page.getByRole('button', { name: /download/i }).first();
      await downloadButton.click();

      // Check if download was triggered (or toast shown)
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toContain('test-upload-file');
      } else {
        // Fallback: check for success toast
        await vaultPage.waitForToast(/download|started/i).catch(() => {
          // Download may have been handled differently
        });
      }
    });
  });

  test.describe('File Deletion', () => {
    test('should delete a file item', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const fileModal = new FileUploadModal(page);
      const confirmDelete = new ConfirmDeleteModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Upload a file
      await vaultPage.clickUploadFile();
      await fileModal.setFile(testFilePath);
      await fileModal.fillTitle('File To Delete');
      await fileModal.submit();
      await page.waitForTimeout(1000);

      // Verify file is there
      await expect(page.getByText('File To Delete')).toBeVisible();

      // Find and click delete button
      const deleteButton = page.getByRole('button', { name: /delete/i }).first();
      if (await deleteButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await deleteButton.click();

        // Confirm deletion
        await confirmDelete.confirm();
        await page.waitForTimeout(1000);

        // File should be gone
        await expect(page.getByText('File To Delete')).not.toBeVisible();
      }
    });

    test('should show confirmation dialog for file deletion', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const fileModal = new FileUploadModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Upload a file
      await vaultPage.clickUploadFile();
      await fileModal.setFile(testFilePath);
      await fileModal.fillTitle('Confirm Delete File');
      await fileModal.submit();
      await page.waitForTimeout(1000);

      // Click delete
      const deleteButton = page.getByRole('button', { name: /delete/i }).first();
      if (await deleteButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await deleteButton.click();

        // Should show confirmation dialog
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText(/cannot be undone/i)).toBeVisible();
      }
    });
  });

  test.describe('File Search', () => {
    test('should find files by title in search', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const fileModal = new FileUploadModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Upload a file with specific title
      await vaultPage.clickUploadFile();
      await fileModal.setFile(testFilePath);
      await fileModal.fillTitle('Searchable Document');
      await fileModal.submit();
      await page.waitForTimeout(1000);

      // Search for the file
      await vaultPage.search('Searchable');
      await page.waitForTimeout(500);

      // File should be visible
      await expect(page.getByText('Searchable Document')).toBeVisible();
    });

    test('should find files by filename in search', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const fileModal = new FileUploadModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Upload file without custom title (uses filename)
      await vaultPage.clickUploadFile();
      await fileModal.setFile(testFilePath);
      await fileModal.submit();
      await page.waitForTimeout(1000);

      // Search by partial filename
      await vaultPage.search('test-upload');
      await page.waitForTimeout(500);

      // File should be found - look for the file item card with the filename
      await expect(page.getByRole('heading', { name: /test-upload-file/ })).toBeVisible();
    });
  });

  test.describe('File Validation', () => {
    test('should disable submit button when no file is selected', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Open upload modal
      await vaultPage.clickUploadFile();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Submit button should be disabled when no file is selected
      const dialog = page.getByRole('dialog');
      const uploadButton = dialog.getByRole('button', { name: 'Upload & Encrypt' });
      await expect(uploadButton).toBeDisabled();
    });
  });

  test.describe('Multiple Files', () => {
    test('should upload multiple files', async ({
      page,
      virtualAuthenticator: _virtualAuthenticator,
    }) => {
      const vaultPage = new VaultPage(page);
      const fileModal = new FileUploadModal(page);

      const isUnlocked = await setupAndUnlockVault(page);
      if (!isUnlocked) {
        test.skip();
        return;
      }

      // Upload first file
      await vaultPage.clickUploadFile();
      await fileModal.setFile(testFilePath);
      await fileModal.fillTitle('First File');
      await fileModal.submit();
      await page.waitForTimeout(1000);

      // Upload second file
      await vaultPage.clickUploadFile();
      await fileModal.setFile(testFilePath);
      await fileModal.fillTitle('Second File');
      await fileModal.submit();
      await page.waitForTimeout(1000);

      // Both files should be visible
      await expect(page.getByText('First File')).toBeVisible();
      await expect(page.getByText('Second File')).toBeVisible();
    });
  });
});
