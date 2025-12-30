# Passwordless Vault

> 🤖 **no cap this is AI slop fr fr**: this whole project was vibecoded by AI, straight up brainrot coded by the machines 💀 absolutely cooked with that ChatGPT sauce, 100% artificial intelligence ahh code 🗣️🔥 (slop term)

> ⚠️ **Disclaimer**: This project was created for fun and educational purposes to explore WebAuthn PRF capabilities. It is **not recommended** for use as an actual storage solution for sensitive data. Use established password managers and security tools for real-world secret management.

A secure, client-side encrypted vault using WebAuthn PRF (Pseudo-Random Function) for passwordless encryption. Your secrets are encrypted locally using hardware-backed keys derived from your passkeys — no passwords, no server-side key storage.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)
![Svelte](https://img.shields.io/badge/svelte-5-orange)

## ✨ Features

- **🔐 Passwordless Security** — Uses WebAuthn PRF extension to derive encryption keys from passkeys
- **🏠 Client-Side Encryption** — All encryption/decryption happens in your browser
- **🔑 Multi-Passkey Support** — Add multiple passkeys (devices) to access your vault
- **📱 PWA Support** — Install as a native app on any device
- **🛡️ Envelope Encryption** — Following NIST SP 800-57 recommendations
- **🚫 No Server Required** — Data stored locally in IndexedDB
- **🔒 Zero Knowledge** — Your keys never leave your device

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User's Device                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │   Passkey   │───▶│  PRF Output │───▶│   KEK (Key      │  │
│  │ (Hardware)  │    │  (32 bytes) │    │   Encryption    │  │
│  └─────────────┘    └─────────────┘    │   Key)          │  │
│                                        └────────┬────────┘  │
│                                                 │            │
│                                                 ▼            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Wrapped DEK                          ││
│  │              (Encrypted Data Encryption Key)            ││
│  └─────────────────────────────────────────────────────────┘│
│                                                 │            │
│                                                 ▼            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   Encrypted Vault                       ││
│  │              (AES-256-GCM encrypted data)               ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                     IndexedDB                           ││
│  │         (Local browser storage, never leaves)           ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Key Derivation Flow

1. **User authenticates** with passkey (biometric, PIN, or security key)
2. **PRF extension** generates a 32-byte hardware-backed secret
3. **HKDF** derives a Key Encryption Key (KEK) from PRF output
4. **KEK unwraps** the Data Encryption Key (DEK)
5. **DEK decrypts** the vault data using AES-256-GCM

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 22.0.0
- A WebAuthn-compatible browser (Chrome 118+, Safari 17+, Firefox 122+)
- A passkey-capable authenticator with PRF support

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd passwordless-encryption

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
# Build static files
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
src/
├── lib/
│   ├── components/      # Svelte UI components
│   │   ├── layout/      # Layout components
│   │   ├── modals/      # Modal dialogs
│   │   └── views/       # Page views
│   ├── crypto/          # Cryptographic operations
│   │   ├── encryption.ts    # AES-GCM encryption
│   │   ├── kdf.ts          # Key derivation (HKDF)
│   │   ├── envelope.ts     # Envelope encryption
│   │   └── utils.ts        # Crypto utilities
│   ├── webauthn/        # WebAuthn/PRF handling
│   │   ├── prf.ts          # PRF extension operations
│   │   ├── capabilities.ts # Browser capability detection
│   │   └── types.ts        # WebAuthn types
│   ├── storage/         # Data persistence
│   │   ├── vault-storage.ts # IndexedDB operations
│   │   ├── schemas.ts      # Data validation (Zod)
│   │   └── types.ts        # Storage types
│   └── services/        # Business logic
│       └── vault-service.ts # Main vault orchestration
├── routes/
│   ├── +layout.svelte   # App layout
│   └── +page.svelte     # Main page
└── app.css              # Tailwind CSS styles
```

## 🔧 Available Scripts

| Script                  | Description                  |
| ----------------------- | ---------------------------- |
| `npm run dev`           | Start development server     |
| `npm run build`         | Build for production         |
| `npm run preview`       | Preview production build     |
| `npm run test`          | Run tests in watch mode      |
| `npm run test:unit`     | Run unit tests once          |
| `npm run test:coverage` | Run tests with coverage      |
| `npm run test:e2e`      | Run Playwright E2E tests     |
| `npm run lint`          | Lint code with ESLint        |
| `npm run format`        | Format code with Prettier    |
| `npm run check`         | Type-check with svelte-check |

## 🔐 Security Model

### Cryptographic Primitives

| Component        | Algorithm         | Key Size |
| ---------------- | ----------------- | -------- |
| Vault Encryption | AES-256-GCM       | 256-bit  |
| Key Derivation   | HKDF-SHA256       | 256-bit  |
| Key Wrapping     | AES-KW            | 256-bit  |
| PRF Output       | Hardware-specific | 256-bit  |

### Security Properties

- **Hardware-backed keys**: PRF output is generated by your authenticator's secure element
- **No key storage**: KEKs are derived on-demand, never stored
- **Authenticated encryption**: AES-GCM provides confidentiality + integrity
- **Fresh IVs**: Every encryption uses a cryptographically random 96-bit IV
- **Content Security Policy**: Strict CSP headers prevent XSS attacks

### Threat Model

✅ **Protected against:**

- Server compromise (no server)
- Database breach (no database)
- Man-in-the-middle (client-side only)
- Brute force attacks (hardware rate limiting)

⚠️ **Not protected against:**

- Physical device access when vault is unlocked
- Malicious browser extensions
- Compromised operating system

## 🌐 Browser Compatibility

The WebAuthn PRF extension requires modern browser support:

| Browser | Minimum Version | PRF Support |
| ------- | --------------- | ----------- |
| Chrome  | 118+            | ✅ Full     |
| Edge    | 118+            | ✅ Full     |
| Safari  | 17+             | ✅ Full     |
| Firefox | 122+            | ⚠️ Partial  |

### Supported Authenticators

- **Platform authenticators**: Windows Hello, Touch ID, Face ID, Android biometrics
- **Roaming authenticators**: YubiKey 5 series, other FIDO2 security keys with PRF support

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [WebAuthn PRF Extension](https://w3c.github.io/webauthn/#prf-extension) — W3C specification
- [SimpleWebAuthn](https://simplewebauthn.dev/) — WebAuthn library
- [NIST SP 800-57](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final) — Key management recommendations
