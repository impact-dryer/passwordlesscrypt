/**
 * Cryptographic utility functions for encoding, decoding, and buffer operations.
 */

/**
 * Converts a string to a Uint8Array using UTF-8 encoding.
 */
export function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Converts a Uint8Array to a UTF-8 string.
 */
export function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Converts a Uint8Array to a base64 string.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
  return btoa(binString);
}

/**
 * Converts a base64 string to a Uint8Array.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binString = atob(base64);
  return Uint8Array.from(binString, (char) => char.codePointAt(0) ?? 0);
}

/**
 * Converts a Uint8Array to a URL-safe base64 string (for credential IDs).
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Converts a URL-safe base64 string to a Uint8Array.
 */
export function base64UrlToBytes(base64url: string): Uint8Array {
  // Add padding if needed
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return base64ToBytes(base64);
}

/**
 * Generates cryptographically secure random bytes.
 */
export function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Securely compares two Uint8Arrays in constant time to prevent timing attacks.
 */
export function constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    // XOR bytes and OR into result - any difference will set bits
    result |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }

  return result === 0;
}

/**
 * Concatenates multiple Uint8Arrays into a single array.
 */
export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);

  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }

  return result;
}

/**
 * Clears sensitive data from a Uint8Array.
 * Note: This is a best-effort operation as JavaScript doesn't guarantee memory clearing.
 */
export function clearBytes(bytes: Uint8Array): void {
  bytes.fill(0);
}

/**
 * Converts an ArrayBuffer to Uint8Array.
 */
export function bufferToBytes(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}
