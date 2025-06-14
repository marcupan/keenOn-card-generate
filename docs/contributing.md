# Contributing Guidelines

This document provides guidelines and instructions for developers who want to contribute to the KeenOn Card Generate
service.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment Setup](#development-environment-setup)
- [Coding Standards](#coding-standards)
- [Git Workflow](#git-workflow)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Guidelines](#documentation-guidelines)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)

## Code of Conduct

We are committed to providing a friendly, safe, and welcoming environment for all contributors. By participating in this
project, you agree to abide by our Code of Conduct:

- Be respectful and inclusive
- Be collaborative
- Be patient and welcoming
- Be careful with your words
- When disagreeing, try to understand why

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/keenOn-card-generate.git`
3. Add the upstream repository: `git remote add upstream https://github.com/ORIGINAL-OWNER/keenOn-card-generate.git`
4. Create a new branch for your changes: `git checkout -b feature/your-feature-name`

## Development Environment Setup

### Prerequisites

- Node.js (v16 or later)
- npm or pnpm
- Docker and Docker Compose
- PostgreSQL (if not using Docker)
- Redis (if not using Docker)

### Setup Steps

1. Install dependencies:

    ```bash
    pnpm install
    ```

2. Set up environment variables:

    ```bash
    cp .env.example .env
    ```

    Edit the `.env` file with your local configuration.

3. Start the development environment:

    ```bash
    docker-compose up -d
    ```

4. Run database migrations:

    ```bash
    pnpm run migrate
    ```

5. Start the development server:
    ```bash
    pnpm run dev
    ```

## Coding Standards

We follow strict coding standards to maintain code quality and consistency:

### TypeScript

- Use TypeScript for all new code
- Enable strict mode in TypeScript configuration
- Use interfaces for object shapes
- Use proper type annotations
- Avoid using `any` type

### Formatting

- We use ESLint and Prettier for code formatting
- Run `pnpm run lint` to check for linting issues
- Run `pnpm run format` to automatically format code
- All code must pass linting before it can be merged

### Naming Conventions

- Use camelCase for variables, functions, and methods
- Use PascalCase for classes, interfaces, types, and enums
- Use UPPER_CASE for constants
- Use descriptive names that reflect the purpose

### File Structure

- One class per file
- File names should match the class name
- Use kebab-case for file names
- Group related files in directories

### Code Organization

- Follow the layered architecture pattern (Controller -> Service -> Repository)
- Keep functions small and focused on a single task
- Use dependency injection for better testability
- Separate business logic from infrastructure concerns

## Git Workflow

We follow a feature branch workflow:

1. Create a new branch for each feature or bug fix
2. Use a descriptive branch name with a prefix:

    - `feature/` for new features
    - `fix/` for bug fixes
    - `docs/` for documentation changes
    - `refactor/` for code refactoring
    - `test/` for adding or updating tests

3. Keep commits small and focused
4. Write clear commit messages:

    ```
    feat: add user authentication endpoint

    - Implement JWT-based authentication
    - Add password hashing with bcrypt
    - Create login and registration endpoints
    ```

5. Rebase your branch on the latest main before submitting a pull request
6. Squash commits if necessary to maintain a clean history

## Pull Request Process

1. Update your branch with the latest changes from main:

    ```bash
    git fetch upstream
    git rebase upstream/main
    ```

2. Ensure all tests pass:

    ```bash
    pnpm run test
    ```

3. Ensure code passes linting:

    ```bash
    pnpm run lint
    ```

4. Create a pull request with a clear title and description
5. Link any related issues in the pull request description
6. Wait for code review and address any feedback
7. Once approved, your changes will be merged

### Pull Request Template

```markdown
## Description

[Provide a brief description of the changes]

## Related Issues

[Link to any related issues, e.g., "Fixes #123"]

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Code refactoring
- [ ] Performance improvement
- [ ] Tests

## Checklist

- [ ] I have read the CONTRIBUTING.md document
- [ ] My code follows the project's coding standards
- [ ] I have added tests that prove my fix/feature works
- [ ] All new and existing tests pass
- [ ] I have updated the documentation accordingly
- [ ] My changes don't introduce new warnings or errors
```

## Testing Guidelines

We strive for high test coverage and quality:

### Test Types

- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test interactions between components
- **API Tests**: Test API endpoints
- **End-to-End Tests**: Test complete user flows

### Testing Standards

- Write tests for all new code
- Maintain or improve test coverage
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Keep tests independent and idempotent

### Running Tests

```bash
# Run all tests
pnpm run test

# Run tests with coverage
pnpm run test:coverage

# Run specific tests
pnpm run test -- -t "test name pattern"
```

## Documentation Guidelines

Good documentation is essential for the project:

### Code Documentation

- Use JSDoc comments for all public methods and functions
- Document parameters, return values, and thrown exceptions
- Provide examples for complex functions
- Keep comments up-to-date with code changes

### API Documentation

- Update OpenAPI/Swagger documentation for API changes
- Document request/response formats
- Include example requests and responses
- Document error responses

### General Documentation

- Update README.md with relevant changes
- Keep documentation in the docs/ directory up-to-date
- Use Markdown for all documentation
- Include diagrams where appropriate

## Issue Reporting

When reporting issues, please include:

1. A clear and descriptive title
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Screenshots or logs (if applicable)
6. Environment information (OS, browser, Node.js version, etc.)
7. Any additional context

## Feature Requests

We welcome feature requests! When submitting a feature request:

1. Check if the feature has already been requested
2. Provide a clear description of the feature
3. Explain the use case and benefits
4. Suggest an implementation approach if possible
5. Be open to discussion and feedback

---

Thank you for contributing to the KeenOn Card Generate service! Your efforts help make this project better for everyone.
