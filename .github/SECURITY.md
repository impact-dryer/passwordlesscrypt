# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of this project seriously. If you discover a security vulnerability, please follow these steps:

### Do NOT

- Open a public GitHub issue
- Disclose the vulnerability publicly before it has been addressed
- Exploit the vulnerability beyond what is necessary to demonstrate it

### Do

1. **Report privately**: Use GitHub's private vulnerability reporting (see below) or contact the maintainers with:
   - A description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact assessment
   - Any suggested fixes (if applicable)

2. **Use GitHub's private vulnerability reporting** (preferred):
   - Go to the Security tab of this repository
   - Click "Report a vulnerability"
   - Fill out the form with details

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Assessment**: We will assess the vulnerability within 7 days
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days
- **Disclosure**: We will coordinate with you on public disclosure timing

### Recognition

We appreciate security researchers who responsibly disclose vulnerabilities. Contributors who report valid security issues will be:

- Credited in our security advisories (unless they prefer anonymity)
- Added to our security hall of fame

## Security Measures

This project implements several security measures:

### Code Security

- Static Application Security Testing (SAST) via CodeQL
- Dependency vulnerability scanning via npm audit and Dependabot
- Secret scanning to prevent credential leaks
- License compliance checking

### Cryptographic Security

- Uses libsodium for cryptographic operations
- Implements WebAuthn PRF extension for passwordless authentication
- All cryptographic code is in `/src/lib/crypto/`

### CI/CD Security

- Minimal permissions in workflows (principle of least privilege)
- Dependency review on pull requests
- Automated security scanning on every commit

## Security-Related Configuration

### Branch Protection

We recommend enabling these branch protection rules:

- Require pull request reviews before merging
- Require status checks to pass before merging
- Require signed commits
- Do not allow force pushes
- Do not allow deletions

### Required Status Checks

- `CI / Lint & Format`
- `CI / Type Check`
- `CI / Test`
- `CI / Build`
- `Security / CodeQL Analysis`
- `Security / npm Audit`







