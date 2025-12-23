# Security Audit Findings & TODOs

> **Audit Date:** December 22, 2025  
> **Auditor:** Security Review (AI-Assisted)  
> **Scope:** Full codebase review from encryption/security expert and attacker perspective

---

## Summary

The cryptographic foundation is solid (AES-256-GCM, HKDF-SHA256, WebAuthn PRF). However, several vulnerabilities exist primarily around session management, memory handling, and defense-in-depth.

**Overall Risk:** Medium - Cryptographic core is secure, but operational security gaps exist.

---

## Critical Priority

### [ ] SEC-001: Add Auto-Lock Timeout

**File:** `src/lib/services/vault-service.ts`  
**Severity:** Critical  
**Type:** Missing Feature

**Issue:**  
Vault remains unlocked indefinitely after authentication. User walking away = full vault access for anyone with physical device access.

**Recommendation:**

```typescript
// Add configurable auto-lock (default: 5-15 minutes)
let lockTimeout: ReturnType<typeof setTimeout> | null = null;
const DEFAULT_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function resetLockTimer(): void {
  if (lockTimeout) clearTimeout(lockTimeout);
  lockTimeout = setTimeout(lockVault, DEFAULT_LOCK_TIMEOUT_MS);
}

// Call resetLockTimer() on every vault operation
```

**References:**

- OWASP Session Management Guidelines
- NIST 800-63B Section 7.2

---

## High Priority

### [ ] SEC-002: Use Non-Empty Salt in HKDF

**File:** `src/lib/crypto/kdf.ts:49`  
**Severity:** High  
**Type:** Cryptographic Weakness

**Issue:**

```typescript
salt: new Uint8Array().buffer, // Empty salt
```

While RFC 5869 allows empty salt with high-entropy input, using the credential's `prfSalt` provides defense-in-depth.

**Recommendation:**

```typescript
export async function deriveAesKey(
  masterKey: CryptoKey,
  info: string,
  usage: 'encrypt-decrypt' | 'wrap-unwrap',
  salt?: Uint8Array // Add salt parameter
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: (salt ?? new Uint8Array(32)).buffer, // Use provided salt or zero-salt
      hash: 'SHA-256',
      info: infoBytes.buffer as ArrayBuffer,
    }
    // ...
  );
}
```

**References:**

- RFC 5869 Section 3.1
- NIST SP 800-56C

---

### [ ] SEC-003: Best-Effort Memory Clearing on Lock

**File:** `src/lib/services/vault-service.ts:316-324`  
**Severity:** High  
**Type:** Memory Security

**Issue:**  
Decrypted vault contents remain in V8 heap until garbage collected. Memory dumps can recover sensitive data.

**Current Code:**

```typescript
export function lockVault(): void {
  currentDEK = null;
  state = { ...state, isUnlocked: false, vault: null };
}
```

**Recommendation:**

```typescript
export function lockVault(): void {
  // Best-effort clear sensitive strings before releasing references
  if (state.vault?.items) {
    for (const item of state.vault.items) {
      item.content = '';
      item.title = '';
      if (item.username) item.username = '';
      if (item.url) item.url = '';
    }
  }

  currentDEK = null;
  state = {
    ...state,
    isUnlocked: false,
    vault: null,
    currentCredentialId: null,
  };
}
```

**Note:** JavaScript cannot guarantee memory clearing. This is defense-in-depth.

---

### [ ] SEC-004: Documentation Mismatch - AES-GCM vs AES-KW

**Files:**

- `docs/SECURITY.md:58` (claims AES-KW)
- `src/lib/crypto/envelope.ts:53` (uses AES-GCM)

**Severity:** High  
**Type:** Documentation/Implementation Mismatch

**Issue:**  
Documentation claims RFC 3394 AES-KW for key wrapping, but implementation uses AES-GCM.

**Recommendation:**  
Either:

1. Update documentation to reflect AES-GCM usage, OR
2. Change implementation to use actual AES-KW:

```typescript
// Option 2: Use AES-KW (RFC 3394)
export async function wrapDEK(dek: CryptoKey, kek: CryptoKey): Promise<string> {
  const wrappedKey = await crypto.subtle.wrapKey('raw', dek, kek, 'AES-KW');
  return btoa(String.fromCharCode(...new Uint8Array(wrappedKey)));
}
```

---

## Medium Priority

### [ ] SEC-005: Encrypt Vault Metadata

**File:** `src/lib/storage/types.ts:11-20`  
**Severity:** Medium  
**Type:** Information Leakage

**Issue:**  
Vault metadata stored in plaintext reveals:

- `itemCount` - Number of secrets stored
- `createdAt` / `modifiedAt` - Activity patterns

**Recommendation:**  
Move `itemCount` inside encrypted vault, or encrypt metadata with DEK.

---

### [ ] SEC-006: Strengthen CSP - Remove unsafe-inline

**File:** `docs/SECURITY.md:133`  
**Severity:** Medium  
**Type:** XSS Protection

**Issue:**

```javascript
'style-src': ['self', 'unsafe-inline'], // Required for Svelte
```

**Recommendation:**  
Configure SvelteKit for CSP-compatible styles using nonces or hashes. See: https://kit.svelte.dev/docs/configuration#csp

---

### [ ] SEC-007: Add Password Protection to Vault Export

**File:** `src/lib/storage/vault-storage.ts:167-185`  
**Severity:** Medium  
**Type:** Data Protection

**Issue:**  
Export contains complete vault bundle including all wrapped DEKs. Attacker with export + any passkey = full access.

**Recommendation:**  
Add optional password-based encryption layer to exports:

```typescript
export async function exportVaultData(password?: string): Promise<string> {
  const data = await getExportData();
  if (password) {
    return await encryptWithPassword(JSON.stringify(data), password);
  }
  return JSON.stringify(data);
}
```

---

### [ ] SEC-008: Add Rate Limiting for Unlock Attempts

**File:** `src/lib/services/vault-service.ts:234`  
**Severity:** Medium  
**Type:** Denial of Service / Enumeration

**Issue:**  
No application-level throttling on unlock attempts.

**Recommendation:**

```typescript
let failedAttempts = 0;
let lockoutUntil = 0;

export async function unlockVault(): Promise<UnlockResult> {
  if (Date.now() < lockoutUntil) {
    throw new Error(
      `Too many attempts. Try again in ${Math.ceil((lockoutUntil - Date.now()) / 1000)}s`
    );
  }

  try {
    // ... existing unlock logic
    failedAttempts = 0;
    return result;
  } catch (error) {
    failedAttempts++;
    if (failedAttempts >= 5) {
      lockoutUntil = Date.now() + 30 * 1000; // 30 second lockout
    }
    throw error;
  }
}
```

---

## Low Priority

### [ ] SEC-009: Validate Base64 Before Decoding

**File:** `src/lib/crypto/encryption.ts:117`  
**Severity:** Low  
**Type:** Input Validation

**Issue:**  
`atob()` throws on invalid input without explicit validation.

**Recommendation:**

```typescript
function isValidBase64(str: string): boolean {
  try {
    return btoa(atob(str)) === str;
  } catch {
    return false;
  }
}
```

---

### [ ] SEC-010: Add Audit Logging (Optional)

**File:** New file - `src/lib/services/audit-log.ts`  
**Severity:** Low  
**Type:** Forensics / Compliance

**Issue:**  
No record of vault access, failed attempts, or changes.

**Recommendation:**  
Add optional audit log stored locally:

```typescript
interface AuditEvent {
  timestamp: number;
  event: 'unlock' | 'lock' | 'item_add' | 'item_delete' | 'passkey_add' | 'unlock_failed';
  credentialId?: string;
}
```

---

### [ ] SEC-011: Use constantTimeEquals for Sensitive Comparisons

**File:** `src/lib/crypto/utils.ts:64-80`  
**Severity:** Low  
**Type:** Timing Attack Prevention

**Issue:**  
`constantTimeEquals` function exists but isn't used for credential ID comparisons.

**Recommendation:**  
Review all string comparisons in authentication flow and use constant-time comparison where appropriate.

---

### [ ] SEC-012: Fix Constant-Time Comparison Length Leak

**File:** `src/lib/crypto/utils.ts:65-67`  
**Severity:** Low  
**Type:** Side Channel

**Issue:**

```typescript
if (a.length !== b.length) {
  return false; // Early return leaks length info
}
```

**Recommendation:**

```typescript
export function constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
  const maxLen = Math.max(a.length, b.length);
  let result = a.length ^ b.length; // Length difference contributes to result

  for (let i = 0; i < maxLen; i++) {
    const aVal = i < a.length ? a[i] : 0;
    const bVal = i < b.length ? b[i] : 0;
    result |= aVal ^ bVal;
  }

  return result === 0;
}
```

---

## Attack Vectors Summary

| Attack Type                   | Risk Level | Mitigation Status            |
| ----------------------------- | ---------- | ---------------------------- |
| Brute force encrypted vault   | Infeasible | ✅ AES-256                   |
| XSS while unlocked            | High       | ⚠️ CSP needs hardening       |
| Physical access (unlocked)    | High       | ❌ No auto-lock              |
| Memory forensics              | Medium     | ⚠️ Best-effort only          |
| Malicious browser extension   | Medium     | ⚠️ Inherent browser risk     |
| Stolen vault + stolen passkey | High       | ✅ By design (requires both) |
| Metadata analysis             | Low        | ⚠️ Some leakage              |

---

## Testing Checklist

- [ ] Unit tests for auto-lock timeout
- [ ] Integration test for memory clearing
- [ ] E2E test for rate limiting
- [ ] Security regression tests for each fix
- [ ] Penetration test after fixes

---

## References

- [NIST SP 800-38D](https://csrc.nist.gov/publications/detail/sp/800-38d/final) - AES-GCM
- [NIST SP 800-56C](https://csrc.nist.gov/publications/detail/sp/800-56c/rev-2/final) - Key Derivation
- [RFC 5869](https://www.rfc-editor.org/rfc/rfc5869) - HKDF
- [RFC 3394](https://www.rfc-editor.org/rfc/rfc3394) - AES Key Wrap
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [WebAuthn Level 3](https://w3c.github.io/webauthn/) - PRF Extension
