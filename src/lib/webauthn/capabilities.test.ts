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
    // Restore original values
    if (originalPublicKeyCredential) {
      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: originalPublicKeyCredential,
        writable: true,
        configurable: true,
      });
    }
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
        value: function PublicKeyCredential() {},
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(caps.webAuthnSupported).toBe(true);
    });

    it('should detect platform authenticator availability', async () => {
      const mockIsAvailable = vi.fn().mockResolvedValue(true);

      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: Object.assign(function PublicKeyCredential() {}, {
          isUserVerifyingPlatformAuthenticatorAvailable: mockIsAvailable,
        }),
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
        value: Object.assign(function PublicKeyCredential() {}, {
          isUserVerifyingPlatformAuthenticatorAvailable: mockIsAvailable,
        }),
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(caps.platformAuthenticatorAvailable).toBe(false);
    });

    it('should detect conditional mediation availability', async () => {
      const mockIsConditional = vi.fn().mockResolvedValue(true);

      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: Object.assign(function PublicKeyCredential() {}, {
          isConditionalMediationAvailable: mockIsConditional,
        }),
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
        value: Object.assign(function PublicKeyCredential() {}, {
          getClientCapabilities: mockGetClientCapabilities,
        }),
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
        value: Object.assign(function PublicKeyCredential() {}, {
          getClientCapabilities: mockGetClientCapabilities,
        }),
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(caps.prfSupported).toBe(false);
    });

    it('should handle getClientCapabilities error gracefully', async () => {
      const mockGetClientCapabilities = vi.fn().mockRejectedValue(new Error('Not supported'));

      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: Object.assign(function PublicKeyCredential() {}, {
          getClientCapabilities: mockGetClientCapabilities,
        }),
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(caps.prfSupported).toBe(false);
    });

    it('should handle conditional mediation check failure', async () => {
      const mockIsConditional = vi.fn().mockRejectedValue(new Error('Failed'));

      Object.defineProperty(globalThis, 'PublicKeyCredential', {
        value: Object.assign(function PublicKeyCredential() {}, {
          isConditionalMediationAvailable: mockIsConditional,
        }),
        writable: true,
        configurable: true,
      });

      const caps = await detectCapabilities();
      expect(caps.conditionalMediationAvailable).toBe(false);
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


