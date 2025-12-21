import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectCapabilities, getPRFSupportMessage } from './capabilities';
import type { PlatformCapabilities } from './types';

describe('webauthn/capabilities', () => {
  const originalPublicKeyCredential = globalThis.PublicKeyCredential;
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original values - PublicKeyCredential may not exist in test environment
    Object.defineProperty(globalThis, 'PublicKeyCredential', {
      value: originalPublicKeyCredential,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis.navigator, 'userAgent', {
      value: originalNavigator.userAgent,
      writable: true,
      configurable: true,
    });
  });

  describe('detectCapabilities', () => {
    it('should return false for webAuthnSupported when PublicKeyCredential is undefined', async () => {
      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(caps.webAuthnSupported).toBe(false);
    });

    it('should detect webAuthnSupported when PublicKeyCredential exists', async () => {
      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: function PublicKeyCredential(): void {
          // Mock constructor
        },
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(caps.webAuthnSupported).toBe(true);
    });

    it('should detect platform authenticator availability', async () => {
      const mockIsAvailable = vi.fn().mockResolvedValue(true);

      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: Object.assign(
          function PublicKeyCredential(): void {
            // Mock constructor
          },
          {
            isUserVerifyingPlatformAuthenticatorAvailable: mockIsAvailable,
          }
        ),
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(mockIsAvailable).toHaveBeenCalled();
      expect(caps.platformAuthenticatorAvailable).toBe(true);
    });

    it('should handle platform authenticator check failure gracefully', async () => {
      const mockIsAvailable = vi.fn().mockRejectedValue(new Error('Not available'));

      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: Object.assign(
          function PublicKeyCredential(): void {
            // Mock constructor
          },
          {
            isUserVerifyingPlatformAuthenticatorAvailable: mockIsAvailable,
          }
        ),
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(caps.platformAuthenticatorAvailable).toBe(false);
    });

    it('should detect conditional mediation availability', async () => {
      const mockIsConditional = vi.fn().mockResolvedValue(true);

      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: Object.assign(
          function PublicKeyCredential(): void {
            // Mock constructor
          },
          {
            isConditionalMediationAvailable: mockIsConditional,
          }
        ),
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(mockIsConditional).toHaveBeenCalled();
      expect(caps.conditionalMediationAvailable).toBe(true);
    });

    it('should detect PRF support via getClientCapabilities', async () => {
      const mockGetClientCapabilities = vi.fn().mockResolvedValue({
        extensions: ['prf', 'largeBlob'],
      });

      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: Object.assign(
          function PublicKeyCredential(): void {
            // Mock constructor
          },
          {
            getClientCapabilities: mockGetClientCapabilities,
          }
        ),
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(mockGetClientCapabilities).toHaveBeenCalled();
      expect(caps.prfSupported).toBe(true);
    });

    it('should handle getClientCapabilities without prf extension', async () => {
      const mockGetClientCapabilities = vi.fn().mockResolvedValue({
        extensions: ['largeBlob'],
      });

      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: Object.assign(
          function PublicKeyCredential(): void {
            // Mock constructor
          },
          {
            getClientCapabilities: mockGetClientCapabilities,
          }
        ),
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(caps.prfSupported).toBe(false);
    });

    it('should handle getClientCapabilities error gracefully', async () => {
      const mockGetClientCapabilities = vi.fn().mockRejectedValue(new Error('Not supported'));

      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: Object.assign(
          function PublicKeyCredential(): void {
            // Mock constructor
          },
          {
            getClientCapabilities: mockGetClientCapabilities,
          }
        ),
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(caps.prfSupported).toBe(false);
    });

    it('should handle conditional mediation check failure', async () => {
      const mockIsConditional = vi.fn().mockRejectedValue(new Error('Failed'));

      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: Object.assign(
          function PublicKeyCredential(): void {
            // Mock constructor
          },
          {
            isConditionalMediationAvailable: mockIsConditional,
          }
        ),
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(caps.conditionalMediationAvailable).toBe(false);
    });

    it('should detect PRF support via Chrome 116+ user agent fallback', async () => {
      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: function PublicKeyCredential(): void {
          // Mock constructor - no getClientCapabilities
        },
        writable: true,
        configurable: true,
      });

      // Ensure navigator.credentials exists for isModernBrowser check
      Object.defineProperty(globalThis.navigator, 'credentials', {
        value: {},
        writable: true,
        configurable: true,
      });

      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36',
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(caps.prfSupported).toBe(true);
    });

    it('should detect PRF support via Safari 18 user agent fallback', async () => {
      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: function PublicKeyCredential(): void {
          // Mock constructor - no getClientCapabilities
        },
        writable: true,
        configurable: true,
      });

      // Ensure navigator.credentials exists for isModernBrowser check
      Object.defineProperty(globalThis.navigator, 'credentials', {
        value: {},
        writable: true,
        configurable: true,
      });

      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(caps.prfSupported).toBe(true);
    });

    it('should detect PRF support via Firefox 130+ user agent fallback', async () => {
      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: function PublicKeyCredential(): void {
          // Mock constructor - no getClientCapabilities
        },
        writable: true,
        configurable: true,
      });

      // Ensure navigator.credentials exists for isModernBrowser check
      Object.defineProperty(globalThis.navigator, 'credentials', {
        value: {},
        writable: true,
        configurable: true,
      });

      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0',
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(caps.prfSupported).toBe(true);
    });

    it('should not detect PRF support for older Chrome versions', async () => {
      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: function PublicKeyCredential(): void {
          // Mock constructor - no getClientCapabilities
        },
        writable: true,
        configurable: true,
      });

      // Ensure navigator.credentials exists for isModernBrowser check
      Object.defineProperty(globalThis.navigator, 'credentials', {
        value: {},
        writable: true,
        configurable: true,
      });

      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: 'Mozilla/5.0 Chrome/100.0.0.0 Safari/537.36',
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(caps.prfSupported).toBe(false);
    });

    it('should not detect PRF support for older Firefox versions', async () => {
      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: function PublicKeyCredential(): void {
          // Mock constructor - no getClientCapabilities
        },
        writable: true,
        configurable: true,
      });

      // Ensure navigator.credentials exists for isModernBrowser check
      Object.defineProperty(globalThis.navigator, 'credentials', {
        value: {},
        writable: true,
        configurable: true,
      });

      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(caps.prfSupported).toBe(false);
    });

    it('should not detect PRF support for unknown browsers', async () => {
      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: function PublicKeyCredential(): void {
          // Mock constructor - no getClientCapabilities
        },
        writable: true,
        configurable: true,
      });

      // Ensure navigator.credentials exists for isModernBrowser check
      Object.defineProperty(globalThis.navigator, 'credentials', {
        value: {},
        writable: true,
        configurable: true,
      });

      Object.defineProperty(globalThis.navigator, 'userAgent', {
        value: 'Mozilla/5.0 Unknown/1.0',
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(caps.prfSupported).toBe(false);
    });
  });

  describe('getPRFSupportMessage', () => {
    it('should return message when WebAuthn not supported', () => {
      const caps: PlatformCapabilities = {
        webAuthnSupported: false,
        platformAuthenticatorAvailable: false,
        prfSupported: false,
        conditionalMediationAvailable: false,
      };

      const message = getPRFSupportMessage(caps);
      expect(message).toContain('does not support WebAuthn');
    });

    it('should return message when PRF not supported', () => {
      const caps: PlatformCapabilities = {
        webAuthnSupported: true,
        platformAuthenticatorAvailable: true,
        prfSupported: false,
        conditionalMediationAvailable: false,
      };

      const message = getPRFSupportMessage(caps);
      expect(message).toContain('PRF extension');
    });

    it('should return message when no platform authenticator', () => {
      const caps: PlatformCapabilities = {
        webAuthnSupported: true,
        platformAuthenticatorAvailable: false,
        prfSupported: true,
        conditionalMediationAvailable: false,
      };

      const message = getPRFSupportMessage(caps);
      expect(message).toContain('No built-in authenticator');
    });

    it('should return null when all capabilities supported', () => {
      const caps: PlatformCapabilities = {
        webAuthnSupported: true,
        platformAuthenticatorAvailable: true,
        prfSupported: true,
        conditionalMediationAvailable: true,
      };

      const message = getPRFSupportMessage(caps);
      expect(message).toBeNull();
    });
  });
});




