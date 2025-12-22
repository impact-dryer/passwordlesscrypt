/**
 * Page Object Models for E2E Tests
 *
 * Provides reusable page interactions and selectors for testing the Passwordless Vault app.
 * Follows the Page Object Model pattern for maintainable E2E tests.
 */

import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Base page object with common functionality
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the application
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  /**
   * Wait for the application to finish loading
   */
  async waitForLoad(): Promise<void> {
    // Wait for loading view to disappear
    await this.page
      .waitForSelector('text=Loading', { state: 'hidden', timeout: 10000 })
      .catch(() => {
        // Loading text may never appear if load is fast
      });
  }

  /**
   * Get toast notification
   */
  getToast(): Locator {
    return this.page.locator('[role="alert"], [data-testid="toast"]');
  }

  /**
   * Wait for toast with specific message
   */
  async waitForToast(message: string | RegExp): Promise<void> {
    await expect(this.page.getByText(message)).toBeVisible({ timeout: 5000 });
  }
}

/**
 * Setup view page object
 */
export class SetupPage extends BasePage {
  /**
   * Check if setup view is displayed
   */
  async isVisible(): Promise<boolean> {
    // Look for the main "Create Your Vault" button on setup page
    const setupButton = this.page.getByRole('button', { name: 'Create Your Vault' });
    return setupButton.isVisible().catch(() => false);
  }

  /**
   * Click to start vault setup - opens the setup modal
   */
  async clickCreateVault(): Promise<void> {
    // Main setup page button says "Create Your Vault"
    const button = this.page.getByRole('button', { name: 'Create Your Vault' });
    await button.click();
  }

  /**
   * Fill in setup form
   */
  async fillSetupForm(userName: string, passkeyName: string): Promise<void> {
    await this.page
      .getByLabel(/name|display name/i)
      .first()
      .fill(userName);
    await this.page.getByLabel(/passkey name|key name/i).fill(passkeyName);
  }

  /**
   * Submit setup form - clicks the modal's submit button
   */
  async submitSetup(): Promise<void> {
    // Inside the modal, the button is "Create Vault" (without "Your")
    const dialog = this.page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Create Vault' }).click();
  }

  /**
   * Complete full vault setup
   */
  async setupVault(userName: string, passkeyName: string): Promise<void> {
    await this.clickCreateVault();
    await this.fillSetupForm(userName, passkeyName);
    await this.submitSetup();
  }
}

/**
 * Locked view page object
 */
export class LockedPage extends BasePage {
  /**
   * Check if locked view is displayed
   */
  async isVisible(): Promise<boolean> {
    const unlockButton = this.page.getByRole('button', { name: /unlock/i });
    return unlockButton.isVisible().catch(() => false);
  }

  /**
   * Click unlock button
   */
  async clickUnlock(): Promise<void> {
    await this.page.getByRole('button', { name: /unlock/i }).click();
  }

  /**
   * Get the passkey list
   */
  getPasskeyList(): Locator {
    return this.page.locator('[data-testid="passkey-list"]');
  }
}

/**
 * Vault content view page object
 */
export class VaultPage extends BasePage {
  /**
   * Check if vault content view is displayed
   */
  async isVisible(): Promise<boolean> {
    // Look for vault header or add item button
    const addButton = this.page.getByRole('button', { name: /add|new/i });
    return addButton.isVisible().catch(() => false);
  }

  /**
   * Get the search input
   */
  getSearchInput(): Locator {
    return this.page.getByPlaceholder(/search/i);
  }

  /**
   * Search for items
   */
  async search(query: string): Promise<void> {
    await this.getSearchInput().fill(query);
  }

  /**
   * Clear search
   */
  async clearSearch(): Promise<void> {
    await this.getSearchInput().clear();
  }

  /**
   * Click add item button
   */
  async clickAddItem(): Promise<void> {
    // Use exact "Add Item" to avoid matching "Add Your First Item"
    const button = this.page.getByRole('button', { name: 'Add Item' });
    if (await button.isVisible().catch(() => false)) {
      await button.click();
    } else {
      // Fallback for empty state
      await this.page.getByRole('button', { name: /add.*first.*item/i }).click();
    }
  }

  /**
   * Click upload file button
   */
  async clickUploadFile(): Promise<void> {
    await this.page.getByRole('button', { name: 'Upload File' }).click();
  }

  /**
   * Get all vault item cards
   */
  getItemCards(): Locator {
    return this.page.locator('[data-testid="vault-item-card"]');
  }

  /**
   * Get vault item by title
   */
  getItemByTitle(title: string): Locator {
    return this.page.locator(`[data-testid="vault-item-card"]:has-text("${title}")`);
  }

  /**
   * Click edit on an item
   */
  async editItem(title: string): Promise<void> {
    const item = this.getItemByTitle(title);
    await item.getByRole('button', { name: /edit/i }).click();
  }

  /**
   * Click delete on an item
   */
  async deleteItem(title: string): Promise<void> {
    const item = this.getItemByTitle(title);
    await item.getByRole('button', { name: /delete/i }).click();
  }

  /**
   * Click settings button
   */
  async openSettings(): Promise<void> {
    await this.page.getByRole('button', { name: /settings|gear/i }).click();
  }

  /**
   * Click lock button
   */
  async lock(): Promise<void> {
    await this.page.getByRole('button', { name: /lock/i }).click();
  }

  /**
   * Get the item count from header
   */
  async getItemCount(): Promise<string> {
    const count = this.page.locator('text=/\\d+ items?/i');
    const text = await count.textContent();
    return text ?? '0 items';
  }
}

/**
 * Item form modal page object
 */
export class ItemFormModal extends BasePage {
  /**
   * Check if modal is open
   */
  async isOpen(): Promise<boolean> {
    return this.page
      .getByRole('dialog')
      .isVisible()
      .catch(() => false);
  }

  /**
   * Select item type
   */
  async selectType(type: 'password' | 'note' | 'secret'): Promise<void> {
    // Use direct pattern matching to avoid object injection issues
    let pattern: RegExp;
    if (type === 'password') {
      pattern = /password/i;
    } else if (type === 'note') {
      pattern = /note/i;
    } else {
      pattern = /secret/i;
    }
    await this.page.getByRole('button', { name: pattern }).click();
  }

  /**
   * Fill title field
   */
  async fillTitle(title: string): Promise<void> {
    await this.page.getByLabel(/title/i).fill(title);
  }

  /**
   * Fill content field
   */
  async fillContent(content: string): Promise<void> {
    // Content might be a textarea or input
    const contentField = this.page
      .locator('textarea[name="content"], input[name="content"], [data-testid="content-input"]')
      .first();
    await contentField.fill(content);
  }

  /**
   * Fill URL field (for passwords)
   */
  async fillUrl(url: string): Promise<void> {
    await this.page.getByLabel(/url|website/i).fill(url);
  }

  /**
   * Fill username field (for passwords)
   */
  async fillUsername(username: string): Promise<void> {
    await this.page.getByLabel(/username/i).fill(username);
  }

  /**
   * Click generate password button
   */
  async generatePassword(): Promise<void> {
    await this.page.getByRole('button', { name: /generate/i }).click();
  }

  /**
   * Submit the form
   */
  async submit(): Promise<void> {
    await this.page.getByRole('button', { name: /save|add|create|update/i }).click();
  }

  /**
   * Close the modal
   */
  async close(): Promise<void> {
    await this.page.getByRole('button', { name: /cancel|close/i }).click();
  }

  /**
   * Create a password item
   */
  async createPasswordItem(
    title: string,
    password: string,
    url?: string,
    username?: string
  ): Promise<void> {
    await this.selectType('password');
    await this.fillTitle(title);
    await this.fillContent(password);
    if (url) await this.fillUrl(url);
    if (username) await this.fillUsername(username);
    await this.submit();
  }

  /**
   * Create a note item
   */
  async createNoteItem(title: string, content: string): Promise<void> {
    await this.selectType('note');
    await this.fillTitle(title);
    await this.fillContent(content);
    await this.submit();
  }

  /**
   * Create a secret item
   */
  async createSecretItem(title: string, content: string): Promise<void> {
    await this.selectType('secret');
    await this.fillTitle(title);
    await this.fillContent(content);
    await this.submit();
  }
}

/**
 * Confirm delete modal page object
 */
export class ConfirmDeleteModal extends BasePage {
  /**
   * Check if modal is open
   */
  async isOpen(): Promise<boolean> {
    return this.page
      .getByRole('dialog')
      .isVisible()
      .catch(() => false);
  }

  /**
   * Confirm deletion
   */
  async confirm(): Promise<void> {
    await this.page.getByRole('button', { name: /delete|remove|confirm/i }).click();
  }

  /**
   * Cancel deletion
   */
  async cancel(): Promise<void> {
    await this.page.getByRole('button', { name: /cancel/i }).click();
  }
}

/**
 * Settings view page object
 */
export class SettingsPage extends BasePage {
  /**
   * Check if settings view is displayed
   */
  async isVisible(): Promise<boolean> {
    // Look for passkey management section
    return this.page
      .locator('text=/passkey|security/i')
      .isVisible()
      .catch(() => false);
  }

  /**
   * Get all passkey cards
   */
  getPasskeyCards(): Locator {
    return this.page.locator('[data-testid="passkey-card"]');
  }

  /**
   * Click add passkey button
   */
  async clickAddPasskey(): Promise<void> {
    await this.page.getByRole('button', { name: /add passkey|new passkey/i }).click();
  }

  /**
   * Delete a passkey by name
   */
  async deletePasskey(name: string): Promise<void> {
    const card = this.page.locator(`[data-testid="passkey-card"]:has-text("${name}")`);
    await card.getByRole('button', { name: /delete|remove/i }).click();
  }

  /**
   * Go back to vault
   */
  async backToVault(): Promise<void> {
    await this.page.getByRole('button', { name: /back|settings|close/i }).click();
  }
}

/**
 * Add passkey modal page object
 */
export class AddPasskeyModal extends BasePage {
  /**
   * Check if modal is open
   */
  async isOpen(): Promise<boolean> {
    return this.page
      .getByRole('dialog')
      .isVisible()
      .catch(() => false);
  }

  /**
   * Fill passkey name
   */
  async fillName(name: string): Promise<void> {
    await this.page.getByLabel(/name|passkey/i).fill(name);
  }

  /**
   * Submit the form
   */
  async submit(): Promise<void> {
    await this.page.getByRole('button', { name: /add|create|save/i }).click();
  }

  /**
   * Add a passkey
   */
  async addPasskey(name: string): Promise<void> {
    await this.fillName(name);
    await this.submit();
  }
}

/**
 * File upload modal page object
 */
export class FileUploadModal extends BasePage {
  /**
   * Check if modal is open
   */
  async isOpen(): Promise<boolean> {
    return this.page
      .getByRole('dialog')
      .isVisible()
      .catch(() => false);
  }

  /**
   * Fill title field
   */
  async fillTitle(title: string): Promise<void> {
    await this.page.getByLabel(/title/i).fill(title);
  }

  /**
   * Set file to upload
   */
  async setFile(filePath: string): Promise<void> {
    await this.page.setInputFiles('input[type="file"]', filePath);
  }

  /**
   * Submit the upload
   */
  async submit(): Promise<void> {
    await this.page.getByRole('button', { name: /upload|save/i }).click();
  }

  /**
   * Close the modal
   */
  async close(): Promise<void> {
    await this.page.getByRole('button', { name: /cancel|close/i }).click();
  }
}
