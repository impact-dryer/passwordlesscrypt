/**
 * TypeScript types for WebAuthn with PRF extension support.
 */

/**
 * Stored credential metadata.
 */
export interface StoredCredential {
  /** Base64URL-encoded credential ID */
  id: string;
  /** Raw credential ID bytes as base64 */
  rawId: string;
  /** User-friendly name for this passkey */
  name: string;
  /** When the credential was registered */
  createdAt: number;
  /** Last time this credential was used */
  lastUsedAt: number;
  /** Whether PRF is enabled for this credential */
  prfEnabled: boolean;
  /** The PRF salt used for this credential */
  prfSalt: string;
  /** Authenticator type (platform/cross-platform) */
  authenticatorType: 'platform' | 'cross-platform';
  /** Optional AAGUID for authenticator identification */
  aaguid?: string;
}

/**
 * PRF extension input for navigator.credentials.get()
 */
export interface PRFExtensionInput {
  eval?: {
    first: BufferSource;
    second?: BufferSource;
  };
  evalByCredential?: Record<
    string,
    {
      first: BufferSource;
      second?: BufferSource;
    }
  >;
}

/**
 * PRF extension output from authentication
 */
export interface PRFExtensionOutput {
  enabled?: boolean;
  results?: {
    first?: ArrayBuffer;
    second?: ArrayBuffer;
  };
}

/**
 * Result of a successful credential creation
 */
export interface CredentialCreationResult {
  credential: StoredCredential;
  prfOutput?: Uint8Array;
}

/**
 * Result of a successful authentication
 */
export interface AuthenticationResult {
  credentialId: string;
  prfOutput: Uint8Array;
}

/**
 * Platform capability information
 */
export interface PlatformCapabilities {
  webAuthnSupported: boolean;
  platformAuthenticatorAvailable: boolean;
  prfSupported: boolean;
  conditionalMediationAvailable: boolean;
}

/**
 * Error types for WebAuthn operations
 */
export type WebAuthnErrorType =
  | 'not-supported'
  | 'not-allowed'
  | 'cancelled'
  | 'timeout'
  | 'security-error'
  | 'prf-not-supported'
  | 'prf-not-enabled'
  | 'no-credentials'
  | 'unknown';

/**
 * Custom WebAuthn error with typed error codes
 */
export class WebAuthnError extends Error {
  constructor(
    public readonly type: WebAuthnErrorType,
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'WebAuthnError';
  }
}




