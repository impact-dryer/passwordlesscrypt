# Event Storming - Domain Model

This document captures the domain events, commands, and aggregates identified through Event Storming for the Passwordless Vault application.

## Domain Overview

The Passwordless Vault domain manages encrypted storage of secrets using hardware-backed passkeys. The system uses envelope encryption where passkeys derive Key Encryption Keys (KEK) that wrap a Data Encryption Key (DEK), which encrypts the actual vault data.

## Core Aggregate

### Vault Aggregate

**Aggregate Root:** `VaultService` (`src/lib/services/vault-service.ts`)

**Invariants:**

- At least one passkey must exist at all times
- DEK must be wrapped for every registered passkey
- Vault must be unlocked to modify items or passkeys
- All vault operations must go through the aggregate root

**State Machine:**

```
NotSetup → (SetupVault) → Unlocked
Unlocked → (LockVault) → Locked
Locked → (UnlockVault) → Unlocked
```

## Commands (User Intentions)

Commands represent what users want to do. They are named in imperative form.

### Vault Lifecycle Commands

| Command                             | Description                           | Prerequisites          | Events Produced                                                             |
| ----------------------------------- | ------------------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `setupVault(userName, passkeyName)` | Create a new vault with first passkey | None                   | VaultCreated, PasskeyCreated, DEKGenerated, DEKWrapped, VaultEncrypted      |
| `unlockVault()`                     | Unlock vault with any passkey         | Vault must exist       | VaultUnlocked, PasskeyAuthenticationSucceeded, DEKUnwrapped, VaultDecrypted |
| `lockVault()`                       | Lock vault, clearing sensitive data   | Vault must be unlocked | VaultLocked                                                                 |
| `resetVault()`                      | Delete all vault data                 | Vault must be unlocked | VaultReset                                                                  |

### Passkey Management Commands

| Command                       | Description                         | Prerequisites                               | Events Produced                        |
| ----------------------------- | ----------------------------------- | ------------------------------------------- | -------------------------------------- |
| `addPasskey(passkeyName)`     | Add a new passkey to existing vault | Vault must be unlocked                      | PasskeyCreated, KEKDerived, DEKWrapped |
| `removePasskey(credentialId)` | Remove a passkey from vault         | Vault must be unlocked, at least 2 passkeys | PasskeyRemoved, WrappedDEKRemoved      |

### Vault Item Commands

| Command                        | Description                           | Prerequisites                           | Events Produced                              |
| ------------------------------ | ------------------------------------- | --------------------------------------- | -------------------------------------------- |
| `addVaultItem(item)`           | Add a new item (note/password/secret) | Vault must be unlocked                  | VaultItemAdded, VaultEncrypted               |
| `updateVaultItem(id, updates)` | Update an existing item               | Vault must be unlocked, item must exist | VaultItemUpdated, VaultEncrypted             |
| `deleteVaultItem(id)`          | Delete an item                        | Vault must be unlocked, item must exist | VaultItemDeleted, VaultEncrypted             |
| `addFileItem(file, title?)`    | Add a file to the vault               | Vault must be unlocked, file size valid | FileItemAdded, FileEncrypted, VaultEncrypted |
| `downloadFileItem(itemId)`     | Download a decrypted file             | Vault must be unlocked, item must exist | FileDecrypted, FileDownloaded                |

### Query Commands (Read-Only)

| Command                           | Description                   | Prerequisites          | Returns     |
| --------------------------------- | ----------------------------- | ---------------------- | ----------- |
| `getVaultState()`                 | Get current vault state       | None                   | VaultState  |
| `getVaultItems()`                 | Get all vault items           | Vault must be unlocked | VaultItem[] |
| `searchVaultItems(query)`         | Search vault items            | Vault must be unlocked | VaultItem[] |
| `getMaxFileSize()`                | Get maximum allowed file size | None                   | number      |
| `generateSecurePassword(length?)` | Generate a secure password    | None                   | string      |

## Domain Events (Facts)

Domain events represent facts that have occurred in the system. They are named in past tense.

### Vault Lifecycle Events

- **VaultCreated** - A new vault was created
  - `timestamp: number`
  - `userName: string`
  - `firstPasskeyId: string`

- **VaultUnlocked** - Vault was successfully unlocked
  - `timestamp: number`
  - `credentialId: string`
  - `credentialName: string`

- **VaultLocked** - Vault was locked (sensitive data cleared)
  - `timestamp: number`

- **VaultReset** - All vault data was deleted
  - `timestamp: number`

### Passkey Management Events

- **PasskeyCreated** - A new passkey was registered
  - `timestamp: number`
  - `credentialId: string`
  - `credentialName: string`
  - `isFirstPasskey: boolean`

- **PasskeyRemoved** - A passkey was removed
  - `timestamp: number`
  - `credentialId: string`

- **PasskeyAuthenticationSucceeded** - Passkey authentication succeeded
  - `timestamp: number`
  - `credentialId: string`

- **PasskeyAuthenticationFailed** - Passkey authentication failed
  - `timestamp: number`
  - `credentialId: string`
  - `reason: string`

### Cryptographic Events

- **KEKDerived** - Key Encryption Key was derived from PRF output
  - `timestamp: number`
  - `credentialId: string`

- **DEKGenerated** - Data Encryption Key was generated
  - `timestamp: number`

- **DEKWrapped** - DEK was wrapped with a KEK
  - `timestamp: number`
  - `credentialId: string`

- **DEKUnwrapped** - DEK was unwrapped using a KEK
  - `timestamp: number`
  - `credentialId: string`

- **VaultEncrypted** - Vault data was encrypted
  - `timestamp: number`
  - `itemCount: number`

- **VaultDecrypted** - Vault data was decrypted
  - `timestamp: number`
  - `itemCount: number`

- **FileEncrypted** - A file was encrypted and stored
  - `timestamp: number`
  - `fileId: string`
  - `fileName: string`
  - `fileSize: number`

- **FileDecrypted** - A file was decrypted
  - `timestamp: number`
  - `fileId: string`

- **FileDownloaded** - A file was downloaded
  - `timestamp: number`
  - `fileId: string`
  - `fileName: string`

### Vault Item Events

- **VaultItemAdded** - A new item was added to the vault
  - `timestamp: number`
  - `itemId: string`
  - `itemType: 'note' | 'password' | 'secret' | 'file'`

- **VaultItemUpdated** - An item was updated
  - `timestamp: number`
  - `itemId: string`
  - `itemType: 'note' | 'password' | 'secret' | 'file'`

- **VaultItemDeleted** - An item was deleted
  - `timestamp: number`
  - `itemId: string`
  - `itemType: 'note' | 'password' | 'secret' | 'file'`

- **FileItemAdded** - A file item was added (special case of VaultItemAdded)
  - `timestamp: number`
  - `itemId: string`
  - `fileId: string`
  - `fileName: string`
  - `fileSize: number`

## Bounded Contexts

### Crypto Context (`src/lib/crypto/`)

**Purpose:** Pure cryptographic operations

**Responsibilities:**

- Key derivation (HKDF)
- Key generation and wrapping
- Encryption/decryption (AES-GCM)
- File encryption/decryption
- Cryptographic utilities

**Rules:**

- Stateless (no side effects)
- Pure functions only
- No business logic

**Key Operations:**

- `deriveKEK(prfOutput)` - Derive Key Encryption Key
- `generateDEK()` - Generate Data Encryption Key
- `wrapDEK(dek, kek)` - Wrap DEK with KEK
- `unwrapDEK(wrapped, kek)` - Unwrap DEK
- `encryptObject(key, data)` - Encrypt data
- `decryptObject(key, encrypted)` - Decrypt data

### WebAuthn Context (`src/lib/webauthn/`)

**Purpose:** WebAuthn credential management and PRF extension

**Responsibilities:**

- Passkey creation
- Passkey authentication
- PRF extension handling
- Browser capability detection

**Rules:**

- No knowledge of vault structure
- No knowledge of encryption keys
- Focuses on credential management only

**Key Operations:**

- `createCredential(userName, name)` - Create new passkey
- `authenticateWithCredential(credential)` - Authenticate with specific passkey
- `authenticateWithAnyCredential(credentials)` - Authenticate with any passkey
- `checkPRFSupport()` - Check browser PRF support

### Storage Context (`src/lib/storage/`)

**Purpose:** Data persistence and validation

**Responsibilities:**

- IndexedDB operations
- Data validation (Zod schemas)
- Vault metadata management
- Credential storage
- Wrapped DEK storage
- File blob storage

**Rules:**

- No business logic
- Validation only
- No knowledge of encryption keys

**Key Operations:**

- `saveEncryptedVault(encrypted)` - Save encrypted vault
- `loadEncryptedVault()` - Load encrypted vault
- `saveCredentials(credentials)` - Save passkeys
- `loadCredentials()` - Load passkeys
- `saveWrappedDEKs(deks)` - Save wrapped DEKs
- `getWrappedDEKForCredential(credentialId)` - Get wrapped DEK

### Vault Service Context (`src/lib/services/`)

**Purpose:** Domain orchestration and business logic

**Responsibilities:**

- Aggregate root (Vault)
- Command handling
- State management
- Invariant enforcement
- Orchestrating other contexts

**Rules:**

- All vault operations go through this context
- Maintains aggregate invariants
- Manages in-memory state (DEK)
- Validates prerequisites before operations

### UI Context (`src/lib/components/`)

**Purpose:** Presentation layer

**Responsibilities:**

- User interface
- User interactions
- Display logic

**Rules:**

- No business logic
- Only interacts with Vault Service
- Never directly accesses crypto/storage/webauthn
- Can import types for display purposes

## Value Objects

### VaultItem

Represents a single item in the vault (note, password, secret, or file).

```typescript
interface VaultItem {
  id: string;
  type: 'note' | 'password' | 'secret' | 'file';
  title: string;
  content: string;
  url?: string;
  username?: string;
  createdAt: number;
  modifiedAt: number;
  // File-specific fields
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}
```

### StoredCredential

Represents a registered passkey.

```typescript
interface StoredCredential {
  id: string;
  name: string;
  prfSalt: Uint8Array;
  lastUsed?: number;
}
```

### VaultMetadata

Metadata about the vault (not encrypted).

```typescript
interface VaultMetadata {
  version: number;
  createdAt: number;
  modifiedAt: number;
  itemCount: number;
}
```

### VaultData

The encrypted vault structure.

```typescript
interface VaultData {
  version: number;
  items: VaultItem[];
}
```

## Error Handling

### Domain Errors

Domain errors represent business rule violations:

- `"Vault must be unlocked"` - Operation requires unlocked vault
- `"Cannot remove the last passkey"` - Invariant violation
- `"Vault must be unlocked before resetting"` - Safety check
- `"Item not found"` - Item doesn't exist
- `"File size exceeds maximum"` - Business rule violation

### Technical Errors

Technical errors are wrapped and re-thrown:

- `WebAuthnError` - WebAuthn-specific errors (from WebAuthn context)
- `Error` - Generic errors with domain-focused messages

## Event Flow Examples

### Vault Setup Flow

```
User → setupVault()
  → createCredential() [WebAuthn Context]
  → PasskeyCreated
  → deriveKEK() [Crypto Context]
  → KEKDerived
  → generateDEK() [Crypto Context]
  → DEKGenerated
  → wrapDEK() [Crypto Context]
  → DEKWrapped
  → encryptObject() [Crypto Context]
  → VaultEncrypted
  → saveEncryptedVault() [Storage Context]
  → VaultCreated
```

### Vault Unlock Flow

```
User → unlockVault()
  → authenticateWithAnyCredential() [WebAuthn Context]
  → PasskeyAuthenticationSucceeded
  → deriveKEK() [Crypto Context]
  → KEKDerived
  → getWrappedDEKForCredential() [Storage Context]
  → unwrapDEK() [Crypto Context]
  → DEKUnwrapped
  → loadEncryptedVault() [Storage Context]
  → decryptObject() [Crypto Context]
  → VaultDecrypted
  → VaultUnlocked
```

### Add Passkey Flow

```
User → addPasskey()
  → [Validate: vault unlocked]
  → createCredential() [WebAuthn Context]
  → PasskeyCreated
  → deriveKEK() [Crypto Context]
  → KEKDerived
  → wrapDEK() [Crypto Context]
  → DEKWrapped
  → addCredential() [Storage Context]
  → addWrappedDEK() [Storage Context]
```

## Notes on Current Implementation

The current implementation uses **implicit events** - events are not explicitly published but are represented by the operations that occur. This is acceptable for a client-side application where:

1. There's no event bus or event store
2. Events are primarily for documentation and understanding
3. The aggregate root manages state transitions directly

If the application grows to need:

- Audit logging
- Event sourcing
- Cross-aggregate communication
- Analytics/telemetry

Then an explicit event system should be implemented.
