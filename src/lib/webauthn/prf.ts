/**
 * WebAuthn PRF (Pseudo-Random Function) extension handling.
 * Based on Yubico's Developer Guide to PRF.
 *
 * The PRF extension allows deriving a hardware-backed secret from a passkey,
 * which can then be used as input keying material for encryption.
 */

import { DEFAULT_PRF_SALT } from '$crypto';
import { stringToBytes, bytesToBase64Url, base64UrlToBytes, generateRandomBytes } from '$crypto';
import {
  WebAuthnError,
  type StoredCredential,
  type CredentialCreationResult,
  type AuthenticationResult,
  type PRFExtensionOutput,
} from './types';

// Relying Party configuration
const RP_NAME = 'Passwordless Encryption';
const RP_ID = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

/**
 * Generates a unique PRF salt for a credential.
 * Each credential should have its own salt for domain separation.
 */
export function generatePRFSalt(): string {
  const randomPart = bytesToBase64Url(generateRandomBytes(16));
  return `${DEFAULT_PRF_SALT}-${randomPart}`;
}

/**
 * Creates a new passkey credential with PRF extension enabled.
 *
 * @param userName - Display name for the user
 * @param credentialName - User-friendly name for this passkey
 * @returns Created credential info and optional PRF output (if supported during creation)
 */
export async function createCredential(
  userName: string,
  credentialName: string
): Promise<CredentialCreationResult> {
  // Generate a unique user ID
  const userId = generateRandomBytes(32);
  const prfSalt = generatePRFSalt();

  const challenge = generateRandomBytes(32);
  const createOptions: CredentialCreationOptions = {
    publicKey: {
      rp: {
        name: RP_NAME,
        id: RP_ID,
      },
      user: {
        id: userId.buffer as ArrayBuffer,
        name: userName,
        displayName: userName,
      },
      challenge: challenge.buffer as ArrayBuffer,
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      timeout: 60000,
      authenticatorSelection: {
        residentKey: 'required', // Required for passkeys
        userVerification: 'required',
      },
      attestation: 'none', // Don't need attestation for this use case
      extensions: {
        prf: {}, // Enable PRF capability
      } as AuthenticationExtensionsClientInputs,
    },
  };

  let credential: PublicKeyCredential;
  try {
    const result = await navigator.credentials.create(createOptions);
    if (!result || !(result instanceof PublicKeyCredential)) {
      throw new WebAuthnError('unknown', 'Failed to create credential');
    }
    credential = result;
  } catch (error) {
    throw mapWebAuthnError(error);
  }

  // Check if PRF was enabled
  const extensionResults = credential.getClientExtensionResults() as {
    prf?: PRFExtensionOutput;
  };
  const prfEnabled = extensionResults.prf?.enabled === true;

  if (!prfEnabled) {
    throw new WebAuthnError(
      'prf-not-supported',
      'This authenticator does not support the PRF extension. Try using a different passkey or security key.'
    );
  }

  // Determine authenticator type from response
  const response = credential.response as AuthenticatorAttestationResponse;
  // getTransports() may not be available in older browsers, check if method exists
  let transports: string[] = [];
  if ('getTransports' in response && typeof response.getTransports === 'function') {
    transports = response.getTransports();
  }
  const authenticatorType = transports.includes('internal') ? 'platform' : 'cross-platform';

  const storedCredential: StoredCredential = {
    id: credential.id,
    rawId: bytesToBase64Url(new Uint8Array(credential.rawId)),
    name: credentialName,
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
    prfEnabled: true,
    prfSalt,
    authenticatorType,
  };

  // After creation, we need to authenticate to get the PRF output
  // Some browsers/authenticators support PRF during creation, but it's not universal
  const authResult = await authenticateWithCredential(storedCredential);

  return {
    credential: storedCredential,
    prfOutput: authResult.prfOutput,
  };
}

/**
 * Authenticates with a specific credential and retrieves PRF output.
 *
 * @param credential - The stored credential to authenticate with
 * @returns The credential ID and PRF output
 */
export async function authenticateWithCredential(
  credential: StoredCredential
): Promise<AuthenticationResult> {
  const prfSaltBytes = stringToBytes(credential.prfSalt);
  const challenge = generateRandomBytes(32);
  const credId = base64UrlToBytes(credential.rawId);

  const getOptions: CredentialRequestOptions = {
    publicKey: {
      challenge: challenge.buffer as ArrayBuffer,
      rpId: RP_ID,
      timeout: 60000,
      userVerification: 'required',
      allowCredentials: [
        {
          id: credId.buffer as ArrayBuffer,
          type: 'public-key',
        },
      ],
      extensions: {
        prf: {
          eval: {
            first: prfSaltBytes.buffer as ArrayBuffer,
          },
        },
      } as AuthenticationExtensionsClientInputs,
    },
  };

  let assertion: PublicKeyCredential;
  try {
    const result = await navigator.credentials.get(getOptions);
    if (!result || !(result instanceof PublicKeyCredential)) {
      throw new WebAuthnError('unknown', 'Authentication failed');
    }
    assertion = result;
  } catch (error) {
    throw mapWebAuthnError(error);
  }

  // Extract PRF results
  const extensionResults = assertion.getClientExtensionResults() as {
    prf?: PRFExtensionOutput;
  };
  const prfResults = extensionResults.prf?.results?.first;

  if (!prfResults) {
    throw new WebAuthnError(
      'prf-not-enabled',
      'PRF output not received. The authenticator may not support PRF.'
    );
  }

  return {
    credentialId: assertion.id,
    prfOutput: new Uint8Array(prfResults),
  };
}

/**
 * Authenticates with any available credential (discoverable credentials).
 *
 * @param credentials - List of stored credentials to allow
 * @returns The credential ID and PRF output
 */
export async function authenticateWithAnyCredential(
  credentials: StoredCredential[]
): Promise<AuthenticationResult> {
  if (credentials.length === 0) {
    throw new WebAuthnError('no-credentials', 'No credentials available');
  }

  // Build per-credential PRF salts
  const evalByCredential: Record<string, { first: ArrayBuffer }> = {};
  for (const cred of credentials) {
    const saltBytes = stringToBytes(cred.prfSalt);
    evalByCredential[cred.rawId] = {
      first: saltBytes.buffer as ArrayBuffer,
    };
  }

  const challenge = generateRandomBytes(32);
  const getOptions: CredentialRequestOptions = {
    publicKey: {
      challenge: challenge.buffer as ArrayBuffer,
      rpId: RP_ID,
      timeout: 60000,
      userVerification: 'required',
      allowCredentials: credentials.map((cred) => {
        const credId = base64UrlToBytes(cred.rawId);
        return {
          id: credId.buffer as ArrayBuffer,
          type: 'public-key' as const,
        };
      }),
      extensions: {
        prf: {
          evalByCredential,
        },
      } as AuthenticationExtensionsClientInputs,
    },
  };

  let assertion: PublicKeyCredential;
  try {
    const result = await navigator.credentials.get(getOptions);
    if (!result || !(result instanceof PublicKeyCredential)) {
      throw new WebAuthnError('unknown', 'Authentication failed');
    }
    assertion = result;
  } catch (error) {
    throw mapWebAuthnError(error);
  }

  // Extract PRF results
  const extensionResults = assertion.getClientExtensionResults() as {
    prf?: PRFExtensionOutput;
  };
  const prfResults = extensionResults.prf?.results?.first;

  if (!prfResults) {
    // Fallback: try authenticating with the specific credential
    const usedCredential = credentials.find((c) => c.id === assertion.id);
    if (usedCredential) {
      return authenticateWithCredential(usedCredential);
    }
    throw new WebAuthnError('prf-not-enabled', 'PRF output not received from authenticator.');
  }

  return {
    credentialId: assertion.id,
    prfOutput: new Uint8Array(prfResults),
  };
}

/**
 * Maps DOM exceptions to typed WebAuthn errors.
 */
function mapWebAuthnError(error: unknown): WebAuthnError {
  if (error instanceof WebAuthnError) {
    return error;
  }

  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotSupportedError':
        return new WebAuthnError('not-supported', 'WebAuthn is not supported', error);
      case 'NotAllowedError':
        // Could be user cancelled or security restriction
        if (error.message.includes('cancelled') || error.message.includes('denied')) {
          return new WebAuthnError('cancelled', 'Operation was cancelled', error);
        }
        return new WebAuthnError(
          'not-allowed',
          'Operation not allowed. Make sure you are on HTTPS.',
          error
        );
      case 'SecurityError':
        return new WebAuthnError(
          'security-error',
          'Security error. Make sure you are on HTTPS.',
          error
        );
      case 'AbortError':
        return new WebAuthnError('cancelled', 'Operation was cancelled', error);
      case 'TimeoutError':
        return new WebAuthnError('timeout', 'Operation timed out', error);
      default:
        return new WebAuthnError('unknown', error.message, error);
    }
  }

  if (error instanceof Error) {
    return new WebAuthnError('unknown', error.message, error);
  }

  return new WebAuthnError('unknown', 'An unknown error occurred', error);
}
