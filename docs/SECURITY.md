# Security Documentation

This document describes the security model, cryptographic design, and threat analysis for Passwordless Vault.

## Table of Contents

- [Security Goals](#security-goals)
- [Cryptographic Design](#cryptographic-design)
- [Threat Model](#threat-model)
- [Security Controls](#security-controls)
- [Known Limitations](#known-limitations)
- [Responsible Disclosure](#responsible-disclosure)

## Security Goals

1. **Confidentiality**: Vault contents are only accessible with a registered passkey
2. **Integrity**: Any tampering with encrypted data is detected
3. **Authentication**: Only the legitimate user can unlock the vault
4. **No Password Storage**: No passwords or password-derived keys are ever stored
5. **Local-Only**: Sensitive data never leaves the user's device

## Cryptographic Design

### Algorithm Selection

| Purpose           | Algorithm                  | Rationale                                  |
| ----------------- | -------------------------- | ------------------------------------------ |
| Vault Encryption  | AES-256-GCM                | NIST-approved, authenticated encryption    |
| Key Derivation    | HKDF-SHA256                | NIST SP 800-56C, extracts entropy from PRF |
| Key Wrapping      | AES-KW                     | NIST SP 800-38F, RFC 3394                  |
| Random Generation | `crypto.getRandomValues()` | CSPRNG from browser                        |

### AES-GCM Parameters

```
Key Size:     256 bits
IV Size:      96 bits (12 bytes) - NIST recommended
Tag Size:     128 bits (default)
```

**IV Generation**: Each encryption operation generates a fresh random IV using `crypto.getRandomValues()`. IVs are prepended to ciphertext for storage.

⚠️ **Critical**: AES-GCM must never reuse an IV with the same key. Our design guarantees this by generating a new random IV for every encryption.

### HKDF Parameters

```
Hash:         SHA-256
Salt:         Credential-specific (16 bytes random + prefix)
Info:         "vault-kek-v1" (domain separation)
Output:       256 bits
```

The PRF output from the authenticator is treated as Input Keying Material (IKM). HKDF expands this to derive the KEK.

### Key Wrapping

DEKs are wrapped using AES-KW (RFC 3394) with the KEK. This provides:

- Confidentiality of the DEK
- Integrity protection (built into AES-KW)
- Deterministic output (same input = same output)

## Threat Model

### Assets to Protect

1. **Vault Data**: Passwords, secrets, notes stored by the user
2. **DEK**: Data Encryption Key that protects vault data
3. **Credentials**: WebAuthn credential metadata

### Threat Actors

| Actor              | Capability                   | Motivation                |
| ------------------ | ---------------------------- | ------------------------- |
| Remote Attacker    | Network access, web exploits | Steal credentials/secrets |
| Local Attacker     | Physical device access       | Access vault data         |
| Malicious Software | Code execution               | Exfiltrate data           |

### Attack Vectors & Mitigations

#### 1. Network Attacks

| Attack            | Mitigation                                                         |
| ----------------- | ------------------------------------------------------------------ |
| Man-in-the-Middle | All operations are client-side; no network requests for vault data |
| Server Compromise | No server; data stored locally only                                |
| API Attacks       | No backend API to attack                                           |

#### 2. Client-Side Attacks

| Attack              | Mitigation                                             |
| ------------------- | ------------------------------------------------------ |
| XSS                 | Strict CSP, no `innerHTML`, Svelte auto-escaping       |
| DOM Clobbering      | Using `crypto.randomUUID()` for IDs                    |
| Prototype Pollution | Careful object handling, schema validation             |
| Timing Attacks      | Using constant-time crypto operations (Web Crypto API) |

#### 3. Storage Attacks

| Attack               | Mitigation                                 |
| -------------------- | ------------------------------------------ |
| IndexedDB Inspection | All vault data is AES-256-GCM encrypted    |
| Backup Extraction    | DEK is wrapped; requires passkey to unwrap |
| Cross-Origin Access  | Browser same-origin policy                 |

#### 4. Cryptographic Attacks

| Attack           | Mitigation                     |
| ---------------- | ------------------------------ |
| Brute Force KEK  | 256-bit key space; infeasible  |
| IV Reuse         | Fresh random IV per encryption |
| Key Recovery     | Keys never stored in plaintext |
| Chosen Plaintext | AES-GCM is CPA-secure          |

### What We Don't Protect Against

1. **Unlocked Vault Access**: If the vault is unlocked and an attacker has device access, they can read data
2. **Malicious Browser Extensions**: Extensions with permission can read page content
3. **Compromised OS**: Kernel-level malware can access any process memory
4. **Physical Authenticator Theft**: If someone steals your authenticator AND knows your PIN
5. **Rubber Hose Cryptanalysis**: User coercion is out of scope

## Security Controls

### Content Security Policy

```javascript
{
  'default-src': ['self'],
  'script-src': ['self'],
  'style-src': ['self', 'unsafe-inline'], // Required for Svelte
  'img-src': ['self', 'data:', 'blob:'],
  'connect-src': ['self'],
  'frame-ancestors': ['none'],
  'form-action': ['self'],
  'base-uri': ['self'],
  'object-src': ['none'],
}
```

### Input Validation

All data is validated using Zod schemas before processing:

```typescript
const VaultItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['note', 'password', 'secret']),
  title: z.string().min(1).max(256),
  content: z.string().max(65536),
  // ...
});
```

### Secure Password Generation

Password generation uses rejection sampling to avoid modulo bias:

```typescript
function generateSecurePassword(length: number): string {
  const charset = '...';
  const maxValidByte = Math.floor(256 / charset.length) * charset.length;

  while (password.length < length) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const byte of randomBytes) {
      // Reject bytes that would cause bias
      if (byte < maxValidByte) {
        password += charset[byte % charset.length];
      }
    }
  }
}
```

### Memory Handling

⚠️ **JavaScript Limitation**: JavaScript does not provide secure memory wiping. When the vault is locked:

```typescript
function lockVault(): void {
  currentDEK = null; // Releases reference
  state.vault = null;
}
```

The actual memory containing key material is managed by the browser's garbage collector. `CryptoKey` objects are handled by the Web Crypto implementation, which may use OS-level secure memory.

### Credential Binding

Each passkey has a unique PRF salt, providing domain separation:

```
Salt = "vault-prf-v1-" + random(16 bytes, base64url)
```

This ensures that:

1. Different credentials derive different KEKs
2. The same authenticator produces different outputs for different vaults
3. PRF outputs cannot be correlated across services

## Known Limitations

### Browser Storage

IndexedDB storage limits vary by browser and device. Large vaults may encounter storage quota issues.

### PRF Support

Not all authenticators support the PRF extension:

- Platform authenticators: Generally supported on recent OS versions
- Security keys: Requires CTAP 2.1 with `hmac-secret` extension

### Export/Backup

Currently no export functionality. If all passkeys are lost, vault data is unrecoverable by design.

### Audit Logging

No audit trail of access attempts is maintained.

## Responsible Disclosure

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email security concerns to: [your-email@example.com]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
4. Allow 90 days for remediation before public disclosure

## References

- [NIST SP 800-38D](https://csrc.nist.gov/publications/detail/sp/800-38d/final) — GCM Mode
- [NIST SP 800-56C](https://csrc.nist.gov/publications/detail/sp/800-56c/rev-2/final) — Key Derivation
- [NIST SP 800-57](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final) — Key Management
- [RFC 3394](https://www.rfc-editor.org/rfc/rfc3394) — AES Key Wrap
- [WebAuthn Level 3](https://w3c.github.io/webauthn/) — PRF Extension
