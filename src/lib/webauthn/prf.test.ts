import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generatePRFSalt,
  createCredential,
  authenticateWithCredential,
  authenticateWithAnyCredential,
} from './prf';
import { WebAuthnError } from './types';
import type { StoredCredential } from './types';

// Mock PublicKeyCredential class
class MockPublicKeyCredential {
  id: string;
  rawId: ArrayBuffer;
  type: string = 'public-key';
  response: {
    clientDataJSON: ArrayBuffer;
    authenticatorData: ArrayBuffer;
    signature: ArrayBuffer;
    userHandle: ArrayBuffer;
    getTransports: (() => string[]) | undefined;
  };
  authenticatorAttachment: string = 'platform';
  private extensionResults: Record<string, unknown>;

  constructor(options: {
    id: string;
    rawId: ArrayBuffer;
    extensionResults: Record<string, unknown>;
    hasTransports: boolean;
  }) {
    this.id = options.id;
    this.rawId = options.rawId;
    this.extensionResults = options.extensionResults;
    this.response = {
      clientDataJSON: new ArrayBuffer(0),
      authenticatorData: new ArrayBuffer(0),
      signature: new ArrayBuffer(0),
      userHandle: new ArrayBuffer(0),
      getTransports: options.hasTransports ? () => ['internal'] : undefined,
    };
  }

  getClientExtensionResults() {
    return this.extensionResults;
  }
}

describe('webauthn/prf', () => {
  const mockCredentialId = new Uint8Array(32).fill(0x01);
  const mockPRFOutput = new Uint8Array(32).fill(0x42);

  function setupMockNavigator(options: {
    supportsPRF?: boolean;
    prfOutput?: Uint8Array;
    throwError?: Error;
    hasTransports?: boolean;
  }) {
    // Setup PublicKeyCredential global
    Object.defineProperty(globalThis, 'PublicKeyCredential', {
      value: MockPublicKeyCredential,
      writable: true,
      configurable: true,
    });

    const extensionResults =
      options.supportsPRF === false
        ? {}
        : {
            prf: {
              enabled: true,
              results: {
                first: (options.prfOutput ?? mockPRFOutput).buffer,
              },
            },
          };

    const mockCredential = new MockPublicKeyCredential({
      id: btoa(String.fromCharCode(...mockCredentialId)),
      rawId: mockCredentialId.buffer as ArrayBuffer,
      extensionResults,
      hasTransports: options.hasTransports !== false,
    });

    const mockCreate = options.throwError
      ? vi.fn().mockRejectedValue(options.throwError)
      : vi.fn().mockResolvedValue(mockCredential);

    const mockGet = options.throwError
      ? vi.fn().mockRejectedValue(options.throwError)
      : vi.fn().mockResolvedValue(mockCredential);

    Object.defineProperty(globalThis.navigator, 'credentials', {
      value: {
        create: mockCreate,
        get: mockGet,
      },
      writable: true,
      configurable: true,
    });

    return { mockCreate, mockGet, mockCredential };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generatePRFSalt', () => {
    it('should generate salt with prefix', () => {
      const salt = generatePRFSalt();
      expect(salt).toContain('passwordless-encryption-v1-');
    });

    it('should generate unique salts', () => {
      const salt1 = generatePRFSalt();
      const salt2 = generatePRFSalt();
      expect(salt1).not.toBe(salt2);
    });

    it('should generate non-empty salt', () => {
      const salt = generatePRFSalt();
      expect(salt.length).toBeGreaterThan(20);
    });
  });

  describe('createCredential', () => {
    it('should create credential with PRF enabled', async () => {
      setupMockNavigator({ supportsPRF: true });

      const result = await createCredential('Test User', 'My Passkey');

      expect(result.credential).toBeDefined();
      expect(result.credential.name).toBe('My Passkey');
      expect(result.credential.prfEnabled).toBe(true);
      expect(result.prfOutput).toBeDefined();
    });

    it('should throw when PRF not supported', async () => {
      setupMockNavigator({ supportsPRF: false });

      await expect(createCredential('User', 'Passkey')).rejects.toThrow(WebAuthnError);
      await expect(createCredential('User', 'Passkey')).rejects.toMatchObject({
        type: 'prf-not-supported',
      });
    });

    it('should handle NotAllowedError', async () => {
      const error = new DOMException('Not allowed', 'NotAllowedError');
      setupMockNavigator({ throwError: error });

      await expect(createCredential('User', 'Passkey')).rejects.toThrow(WebAuthnError);
    });

    it('should handle AbortError as cancelled', async () => {
      const error = new DOMException('Aborted', 'AbortError');
      setupMockNavigator({ throwError: error });

      await expect(createCredential('User', 'Passkey')).rejects.toMatchObject({
        type: 'cancelled',
      });
    });

    it('should handle TimeoutError', async () => {
      const error = new DOMException('Timeout', 'TimeoutError');
      setupMockNavigator({ throwError: error });

      await expect(createCredential('User', 'Passkey')).rejects.toMatchObject({
        type: 'timeout',
      });
    });

    it('should detect platform authenticator', async () => {
      setupMockNavigator({ supportsPRF: true, hasTransports: true });

      const result = await createCredential('User', 'Passkey');
      expect(result.credential.authenticatorType).toBe('platform');
    });
  });

  describe('authenticateWithCredential', () => {
    const testCredential: StoredCredential = {
      id: btoa(String.fromCharCode(...mockCredentialId)),
      rawId: btoa(String.fromCharCode(...mockCredentialId))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, ''),
      name: 'Test Passkey',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      prfEnabled: true,
      prfSalt: 'test-salt-123',
      authenticatorType: 'platform',
    };

    it('should authenticate and return PRF output', async () => {
      setupMockNavigator({ supportsPRF: true });

      const result = await authenticateWithCredential(testCredential);

      expect(result.credentialId).toBeDefined();
      expect(result.prfOutput).toBeInstanceOf(Uint8Array);
      expect(result.prfOutput.length).toBe(32);
    });

    it('should throw when PRF output not received', async () => {
      setupMockNavigator({ supportsPRF: false });

      await expect(authenticateWithCredential(testCredential)).rejects.toMatchObject({
        type: 'prf-not-enabled',
      });
    });

    it('should handle authentication errors', async () => {
      const error = new DOMException('Security error', 'SecurityError');
      setupMockNavigator({ throwError: error });

      await expect(authenticateWithCredential(testCredential)).rejects.toMatchObject({
        type: 'security-error',
      });
    });
  });

  describe('authenticateWithAnyCredential', () => {
    const testCredentials: StoredCredential[] = [
      {
        id: 'cred-1',
        rawId: btoa(String.fromCharCode(...new Uint8Array(32).fill(0x01)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, ''),
        name: 'Passkey 1',
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        prfEnabled: true,
        prfSalt: 'salt-1',
        authenticatorType: 'platform',
      },
      {
        id: 'cred-2',
        rawId: btoa(String.fromCharCode(...new Uint8Array(32).fill(0x02)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, ''),
        name: 'Passkey 2',
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        prfEnabled: true,
        prfSalt: 'salt-2',
        authenticatorType: 'cross-platform',
      },
    ];

    it('should throw when no credentials provided', async () => {
      await expect(authenticateWithAnyCredential([])).rejects.toMatchObject({
        type: 'no-credentials',
      });
    });

    it('should authenticate with available credential', async () => {
      setupMockNavigator({ supportsPRF: true });

      const result = await authenticateWithAnyCredential(testCredentials);

      expect(result.credentialId).toBeDefined();
      expect(result.prfOutput).toBeInstanceOf(Uint8Array);
    });

    it('should handle authentication failure', async () => {
      const error = new DOMException('Not allowed', 'NotAllowedError');
      setupMockNavigator({ throwError: error });

      await expect(authenticateWithAnyCredential(testCredentials)).rejects.toThrow(WebAuthnError);
    });
  });

  describe('error mapping', () => {
    it('should map NotSupportedError', async () => {
      const error = new DOMException('Not supported', 'NotSupportedError');
      setupMockNavigator({ throwError: error });

      await expect(createCredential('User', 'Key')).rejects.toMatchObject({
        type: 'not-supported',
      });
    });

    it('should map cancelled in NotAllowedError message', async () => {
      const error = new DOMException('The operation was cancelled', 'NotAllowedError');
      setupMockNavigator({ throwError: error });

      await expect(createCredential('User', 'Key')).rejects.toMatchObject({
        type: 'cancelled',
      });
    });

    it('should handle generic errors', async () => {
      const error = new Error('Generic error');
      setupMockNavigator({ throwError: error });

      await expect(createCredential('User', 'Key')).rejects.toMatchObject({
        type: 'unknown',
      });
    });

    it('should handle non-Error objects', async () => {
      setupMockNavigator({ throwError: 'string error' as unknown as Error });

      await expect(createCredential('User', 'Key')).rejects.toMatchObject({
        type: 'unknown',
      });
    });
  });
});

