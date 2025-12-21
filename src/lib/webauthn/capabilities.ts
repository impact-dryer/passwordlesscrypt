/**
 * Platform capability detection for WebAuthn and PRF support.
 */

import type { PlatformCapabilities } from './types';

/**
 * Detects WebAuthn and PRF capabilities of the current platform.
 * This should be called early to determine available features.
 */
export async function detectCapabilities(): Promise<PlatformCapabilities> {
  const capabilities: PlatformCapabilities = {
    webAuthnSupported: false,
    platformAuthenticatorAvailable: false,
    prfSupported: false,
    conditionalMediationAvailable: false,
  };

  // Check basic WebAuthn support
  if (
    typeof window.PublicKeyCredential === 'undefined' ||
    typeof window.PublicKeyCredential !== 'function'
  ) {
    return capabilities;
  }

  capabilities.webAuthnSupported = true;

  // Check for platform authenticator (Touch ID, Face ID, Windows Hello, etc.)
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      capabilities.platformAuthenticatorAvailable =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    // Ignore errors, leave as false
  }

  // Check for conditional mediation (autofill UI)
  try {
    if (typeof PublicKeyCredential.isConditionalMediationAvailable === 'function') {
      capabilities.conditionalMediationAvailable =
        await PublicKeyCredential.isConditionalMediationAvailable();
    }
  } catch {
    // Ignore errors, leave as false
  }

  // Check for PRF extension support
  // This is a best-effort check - actual support depends on the authenticator
  try {
    if (typeof PublicKeyCredential.getClientCapabilities === 'function') {
      const clientCaps = await (
        PublicKeyCredential as unknown as {
          getClientCapabilities: () => Promise<{ extensions?: string[] }>;
        }
      ).getClientCapabilities();

      if (clientCaps.extensions?.includes('prf') === true) {
        capabilities.prfSupported = true;
      }
    } else {
      // Fallback: assume PRF might be supported on modern browsers
      // Actual support will be verified during credential creation
      const isModernBrowser = 'credentials' in navigator && typeof crypto.subtle !== 'undefined';

      if (isModernBrowser) {
        // Check browser and version for known PRF support
        const ua = navigator.userAgent;
        const isChrome = /Chrome\/(\d+)/.exec(ua);
        const isSafari = /Safari\/(\d+)/.exec(ua) && !ua.includes('Chrome');
        const isFirefox = /Firefox\/(\d+)/.exec(ua);

        if (isChrome !== null && parseInt(isChrome[1] ?? '0', 10) >= 116) {
          capabilities.prfSupported = true;
        } else if (isSafari !== null && ua.includes('Version/18')) {
          capabilities.prfSupported = true;
        } else if (isFirefox !== null && parseInt(isFirefox[1] ?? '0', 10) >= 130) {
          capabilities.prfSupported = true;
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return capabilities;
}

/**
 * Gets a user-friendly message about PRF support limitations.
 */
export function getPRFSupportMessage(capabilities: PlatformCapabilities): string | null {
  if (!capabilities.webAuthnSupported) {
    return 'Your browser does not support WebAuthn. Please use a modern browser like Chrome, Safari, Firefox, or Edge.';
  }

  if (!capabilities.prfSupported) {
    return 'Your browser may not fully support the PRF extension needed for encryption. Chrome 116+, Safari 18+, or Firefox 130+ is recommended.';
  }

  if (!capabilities.platformAuthenticatorAvailable) {
    return 'No built-in authenticator detected. You can still use a security key like YubiKey.';
  }

  return null;
}




