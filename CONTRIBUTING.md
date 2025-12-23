# Contributing to Passwordless Vault

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful and constructive in all interactions. We're all here to learn and build something useful together.

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Use the bug report template
3. Include:
   - Browser and version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Console errors (if any)

### Suggesting Features

1. Open a discussion first for major features
2. Describe the use case and motivation
3. Consider security implications

### Submitting Code

1. **Fork** the repository
2. **Create a branch**: `git checkout -b feature/your-feature`
3. **Make changes** following our conventions
4. **Test** your changes: `npm run test`
5. **Lint** your code: `npm run lint`
6. **Commit** with a clear message
7. **Push** to your fork
8. **Open a Pull Request**

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows project conventions
- [ ] All tests pass (`npm run test:unit`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run check`)
- [ ] New code has test coverage
- [ ] Documentation updated if needed

### PR Title Format

```
type: short description

Examples:
feat: add passkey export functionality
fix: handle PRF timeout error
docs: update security documentation
refactor: simplify key derivation logic
test: add encryption edge case tests
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `refactor`: Code change that doesn't fix a bug or add a feature
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## Development Setup

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed setup instructions.

```bash
# Quick start
git clone <repository-url>
cd passwordless-encryption
npm install
npm run dev
```

## Security Contributions

For security-related issues, please see [docs/SECURITY.md](docs/SECURITY.md#responsible-disclosure) for our responsible disclosure policy.

**Do not** open public issues for security vulnerabilities.

## Questions?

- Open a Discussion for general questions
- Check existing issues and discussions first
- Be patient — maintainers are volunteers

Thank you for contributing! 🙏

