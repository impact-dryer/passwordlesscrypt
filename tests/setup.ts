import { vi } from 'vitest';
import '@testing-library/svelte/vitest';

// Mock crypto.getRandomValues for deterministic tests when needed
const originalGetRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);

export function mockRandomValues(mockFn: (array: Uint8Array) => Uint8Array): void {
  vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(
    mockFn as typeof crypto.getRandomValues
  );
}

export function restoreRandomValues(): void {
  vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(originalGetRandomValues);
}

// WebAuthn mock utilities
export interface MockAuthenticatorOptions {
  readonly supportsPRF: boolean;
  readonly prfOutput?: Uint8Array;
  readonly credentialId?: Uint8Array;
}

export function createMockNavigatorCredentials(options: MockAuthenticatorOptions): void {
  const mockCredentialId = options.credentialId ?? new Uint8Array(32).fill(0x01);
  const mockPRFOutput = options.prfOutput ?? new Uint8Array(32).fill(0x42);

  const mockCredential = {
    id: btoa(String.fromCharCode(...mockCredentialId)),
    rawId: mockCredentialId.buffer,
    type: 'public-key' as const,
    response: {
      clientDataJSON: new ArrayBuffer(0),
      authenticatorData: new ArrayBuffer(0),
      signature: new ArrayBuffer(0),
      userHandle: new ArrayBuffer(0),
    },
    getClientExtensionResults: () => ({
      prf: options.supportsPRF
        ? {
            enabled: true,
            results: {
              first: mockPRFOutput.buffer,
            },
          }
        : undefined,
    }),
    authenticatorAttachment: 'platform' as const,
  };

  Object.defineProperty(globalThis.navigator, 'credentials', {
    value: {
      create: vi.fn().mockResolvedValue(mockCredential),
      get: vi.fn().mockResolvedValue(mockCredential),
    },
    writable: true,
    configurable: true,
  });
}

// Cleanup after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// Global test utilities
declare global {
  function hexToBytes(hex: string): Uint8Array;
  function bytesToHex(bytes: Uint8Array): string;
}

globalThis.hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    const byteValue = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    bytes.set([byteValue], i);
  }
  return bytes;
};

globalThis.bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};
