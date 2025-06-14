# Dependency Management

This directory contains documentation and tools related to dependency management for the keenOn-card-generate service.

## Overview

Proper dependency management is crucial for maintaining a secure, stable, and maintainable application. This project
follows these key principles:

1. **Keep dependencies up-to-date** to benefit from security patches and new features
2. **Minimize dependencies** to reduce attack surface and complexity
3. **Automate security checks** to identify vulnerabilities early
4. **Document third-party service dependencies** and their fallback strategies
5. **Visualize dependencies** to understand relationships and identify potential issues

## Contents

- [Third-Party Service Dependencies](./third-party-services.md) - Documentation of external services and fallback
  strategies
- [Dependency Graph](./dependency-graph.svg) - Visual representation of code dependencies (generated)
- [NPM Dependencies](./npm-dependencies.md) - List of all npm dependencies with versions (generated)

## Tools and Scripts

### Dependency Graph Generator

To generate a visual dependency graph and npm dependency report:

```bash
pnpm dependency-graph
```

This will create:

- `dependency-graph.svg` - Visual representation of code dependencies
- `npm-dependencies.md` - List of all npm dependencies with versions

### Security Audit

To run a security audit of dependencies:

```bash
pnpm security-audit
```

This checks for vulnerabilities in dependencies and reports outdated packages.

### Automated Dependency Updates

This project uses GitHub Dependabot for automated dependency updates with security checks. The configuration is in
`.github/dependabot.yml`.

Dependabot will:

- Check for updates weekly
- Create pull requests for outdated dependencies
- Apply security labels to pull requests
- Group related updates together

### Versioning Strategy

The project follows Semantic Versioning (SemVer):

- MAJOR version for incompatible API changes
- MINOR version for backward-compatible functionality additions
- PATCH version for backward-compatible bug fixes

To update the version:

```bash
# For bug fixes
pnpm version:patch

# For new features
pnpm version:minor

# For breaking changes
pnpm version:major
```

## Best Practices

1. **Regular Audits**: Run `pnpm security-audit` regularly to check for vulnerabilities
2. **Review Dependencies**: Before adding a new dependency, consider:
    - Is it actively maintained?
    - Does it have known security issues?
    - Could we implement the functionality ourselves?
    - What's the license compatibility?
3. **Update Strategy**: Update dependencies incrementally and test thoroughly
4. **Dependency Isolation**: Use dependency injection to isolate third-party code
5. **Fallback Strategies**: Implement fallbacks for all external service dependencies
