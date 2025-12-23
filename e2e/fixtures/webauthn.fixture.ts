/**
 * WebAuthn Test Fixture
 *
 * Provides virtual authenticator support for E2E testing of WebAuthn PRF extension.
 * Uses Chrome DevTools Protocol (CDP) to create and manage virtual authenticators.
 *
 * @see https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/
 */

import { test as base, type Page, type CDPSession } from '@playwright/test';

/**
 * Virtual authenticator configuration options
 */
export interface VirtualAuthenticatorOptions {
  /** Authenticator protocol: ctap2 or u2f */
  protocol?: 'ctap2' | 'u2f';
  /** Transport method */
  transport?: 'usb' | 'nfc' | 'ble' | 'internal';
  /** Support discoverable credentials (resident keys) */
  hasResidentKey?: boolean;
  /** Support user verification */
  hasUserVerification?: boolean;
  /** Is user verification performed */
  isUserVerified?: boolean;
  /** Support PRF extension */
  hasPrf?: boolean;
  /** Automatic user presence assertion */
  automaticPresenceSimulation?: boolean;
}

/**
 * Virtual authenticator context for managing WebAuthn in tests
 */
export interface VirtualAuthenticatorContext {
  /** CDP session */
  cdpSession: CDPSession;
  /** Current authenticator ID */
  authenticatorId: string;
  /** Clear all credentials from the authenticator */
  clearCredentials: () => Promise<void>;
  /** Get all credentials from the authenticator */
  getCredentials: () => Promise<WebAuthnCredential[]>;
  /** Remove the virtual authenticator */
  remove: () => Promise<void>;
}

/**
 * WebAuthn credential from virtual authenticator
 */
export interface WebAuthnCredential {
  credentialId: string;
  isResidentCredential: boolean;
  rpId: string;
  privateKey: string;
  userHandle: string;
  signCount: number;
}

/**
 * Default virtual authenticator options optimized for PRF testing
 */
const defaultOptions: VirtualAuthenticatorOptions = {
  protocol: 'ctap2',
  transport: 'internal',
  hasResidentKey: true,
  hasUserVerification: true,
  isUserVerified: true,
  hasPrf: true,
  automaticPresenceSimulation: true,
};

/**
 * Sets up a virtual authenticator for a page using CDP
 *
 * @param page - Playwright page
 * @param options - Virtual authenticator options
 * @returns Virtual authenticator context
 */
export async function setupVirtualAuthenticator(
  page: Page,
  options: VirtualAuthenticatorOptions = {}
): Promise<VirtualAuthenticatorContext> {
  const config = { ...defaultOptions, ...options };

  // Create CDP session
  const cdpSession = await page.context().newCDPSession(page);

  // Enable WebAuthn domain
  await cdpSession.send('WebAuthn.enable', { enableUI: false });

  // Add virtual authenticator with PRF support
  const response = await cdpSession.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: config.protocol,
      transport: config.transport,
      hasResidentKey: config.hasResidentKey,
      hasUserVerification: config.hasUserVerification,
      isUserVerified: config.isUserVerified,
      automaticPresenceSimulation: config.automaticPresenceSimulation,
      hasPrf: config.hasPrf,
    },
  });

  const authenticatorId = response.authenticatorId;

  return {
    cdpSession,
    authenticatorId,

    async clearCredentials(): Promise<void> {
      await cdpSession.send('WebAuthn.clearCredentials', { authenticatorId });
    },

    async getCredentials(): Promise<WebAuthnCredential[]> {
      const result = await cdpSession.send('WebAuthn.getCredentials', { authenticatorId });
      return result.credentials as WebAuthnCredential[];
    },

    async remove(): Promise<void> {
      await cdpSession.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
    },
  };
}

/**
 * Extended test fixtures for WebAuthn testing
 */
interface WebAuthnFixtures {
  /** Virtual authenticator context */
  virtualAuthenticator: VirtualAuthenticatorContext;
  /** Set up virtual authenticator with custom options */
  setupAuthenticator: (
    options?: VirtualAuthenticatorOptions
  ) => Promise<VirtualAuthenticatorContext>;
}

/**
 * Extended Playwright test with WebAuthn fixtures
 */
export const test = base.extend<WebAuthnFixtures>({
  // Default virtual authenticator fixture
  virtualAuthenticator: async ({ page }, use) => {
    const authenticator = await setupVirtualAuthenticator(page);

    // Use the fixture
    await use(authenticator);

    // Cleanup: remove the virtual authenticator
    try {
      await authenticator.remove();
    } catch {
      // Ignore cleanup errors
    }
  },

  // Custom authenticator setup fixture
  setupAuthenticator: async ({ page }, use) => {
    const authenticators: VirtualAuthenticatorContext[] = [];

    const setup = async (
      options?: VirtualAuthenticatorOptions
    ): Promise<VirtualAuthenticatorContext> => {
      const authenticator = await setupVirtualAuthenticator(page, options);
      authenticators.push(authenticator);
      return authenticator;
    };

    await use(setup);

    // Cleanup all created authenticators
    for (const auth of authenticators) {
      try {
        await auth.remove();
      } catch {
        // Ignore cleanup errors
      }
    }
  },
});

export { expect } from '@playwright/test';

