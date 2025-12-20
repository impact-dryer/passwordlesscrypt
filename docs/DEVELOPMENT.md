# Development Guide

This guide covers development setup, testing, and contribution guidelines.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Project Conventions](#project-conventions)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js** ≥ 22.0.0
- **npm** ≥ 10.0.0 (comes with Node.js)
- **Git**

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "svelte.svelte-vscode",
    "bradlc.vscode-tailwindcss",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
  ]
}
```

### Browser Requirements

For local development, you need a browser that supports:

- WebAuthn with PRF extension
- IndexedDB
- Web Crypto API

**Recommended**: Chrome 118+ or Edge 118+

## Local Development

### Initial Setup

```bash
# Clone repository
git clone https://github.com/yourusername/passwordless-encryption.git
cd passwordless-encryption

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development Server

The dev server runs at `http://localhost:5173` by default.

```bash
# Start with network access (for mobile testing)
npm run dev -- --host

# Start on a different port
npm run dev -- --port 3000
```

### HTTPS for WebAuthn

WebAuthn requires a secure context (HTTPS or localhost). For local development, `localhost` works. For network testing:

```bash
# Generate self-signed certificate (one-time)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Start with HTTPS
npm run dev -- --https --host
```

### Environment Variables

Create a `.env.local` file for local overrides:

```bash
# Example (currently no env vars needed)
VITE_APP_NAME=Passwordless Vault
```

## Testing

### Unit Tests

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:unit

# Run with coverage
npm run test:coverage
```

### Test Structure

```
tests/
├── setup.ts           # Test setup (mocks, globals)
└── unit/             # Unit test files

src/lib/
├── crypto/
│   ├── encryption.ts
│   └── encryption.test.ts   # Co-located tests
```

### Writing Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('EncryptionModule', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  it('should encrypt and decrypt data', async () => {
    const key = await generateDEK();
    const data = { secret: 'test' };

    const encrypted = await encryptObject(key, data);
    const decrypted = await decryptObject(key, encrypted);

    expect(decrypted).toEqual(data);
  });
});
```

### Mocking WebAuthn

WebAuthn requires browser APIs. Use the provided mocks in tests:

```typescript
// tests/setup.ts provides mock implementations
vi.mock('$webauthn', () => ({
  createCredential: vi.fn().mockResolvedValue({
    credential: mockCredential,
    prfOutput: new Uint8Array(32),
  }),
}));
```

### E2E Tests

```bash
# Install Playwright browsers (one-time)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI
npx playwright test --ui
```

### Coverage Thresholds

The project enforces 80% coverage:

```typescript
// vite.config.ts
coverage: {
  thresholds: {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80,
  },
}
```

## Code Quality

### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Formatting

```bash
# Format all files
npm run format

# Check formatting
npx prettier --check .
```

### Type Checking

```bash
# Full type check
npm run check

# Watch mode
npm run check:watch

# TypeScript only
npm run typecheck
```

### Pre-commit Hooks

Husky runs checks before commits:

```bash
# .husky/pre-commit
npm run lint
npm run check
npm run test:unit
```

## Project Conventions

### File Naming

- Components: `PascalCase.svelte`
- Modules: `kebab-case.ts`
- Tests: `module-name.test.ts`
- Types: `types.ts`

### Import Aliases

```typescript
// Use aliases instead of relative paths
import { encrypt } from '$crypto';        // src/lib/crypto
import { Button } from '$components';     // src/lib/components
import type { VaultItem } from '$storage'; // src/lib/storage
```

### Component Structure

```svelte
<script lang="ts">
  // 1. Imports
  import { Button } from '$components';

  // 2. Props (Svelte 5 runes)
  let { title, onClose }: Props = $props();

  // 3. State
  let isLoading = $state(false);

  // 4. Derived values
  let canSubmit = $derived(!isLoading && title.length > 0);

  // 5. Functions
  function handleSubmit() {
    // ...
  }
</script>

<!-- Template -->
<div class="...">
  {#if isLoading}
    <Spinner />
  {:else}
    <slot />
  {/if}
</div>

<style>
  /* Scoped styles (prefer Tailwind classes) */
</style>
```

### Error Handling

```typescript
// Use typed errors
export class WebAuthnError extends Error {
  constructor(
    public readonly code: WebAuthnErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'WebAuthnError';
  }
}

// Throw specific errors
throw new WebAuthnError('prf-not-supported', 'PRF extension not available');
```

### Async Operations

```typescript
// Always handle errors
try {
  const result = await riskyOperation();
} catch (error) {
  if (error instanceof WebAuthnError) {
    // Handle known error
  } else {
    // Log and re-throw unknown errors
    console.error('Unexpected error:', error);
    throw error;
  }
}
```

## Troubleshooting

### WebAuthn Not Working

1. **Check HTTPS**: WebAuthn requires secure context
2. **Check Browser**: Ensure PRF support (Chrome 118+)
3. **Check Authenticator**: Not all security keys support PRF

### IndexedDB Errors

```bash
# Clear browser data for localhost
# Chrome: DevTools > Application > Storage > Clear site data
```

### Type Errors After Update

```bash
# Regenerate SvelteKit types
npm run check

# Clear TypeScript cache
rm -rf node_modules/.cache
```

### Test Failures

```bash
# Run single test file
npx vitest run src/lib/crypto/encryption.test.ts

# Run with verbose output
npx vitest run --reporter=verbose

# Debug in VS Code
# Add breakpoint, then: JavaScript Debug Terminal > npx vitest
```

### Build Errors

```bash
# Clean build
rm -rf build .svelte-kit
npm run build
```

## Deployment

### Static Hosting

Build outputs static files suitable for any static host:

```bash
npm run build
# Output: build/
```

### Recommended Hosts

- **Vercel**: Zero-config SvelteKit support
- **Netlify**: Add `netlify.toml` for redirects
- **Cloudflare Pages**: Fast global CDN
- **GitHub Pages**: Free for public repos

### Security Headers

Ensure your host sets these headers:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```
