#!/bin/bash

# Security Audit Script
# This script performs security checks on dependencies and reports vulnerabilities

echo "Starting security audit..."

# Run npm audit to check for vulnerabilities
echo "Checking for vulnerabilities in dependencies..."
pnpm audit

# Save the exit code to determine if vulnerabilities were found
AUDIT_EXIT_CODE=$?

# Run npm outdated to check for outdated packages
echo "Checking for outdated packages..."
pnpm outdated

# Check if there are any high or critical vulnerabilities
if [ $AUDIT_EXIT_CODE -ne 0 ]; then
  echo "Security vulnerabilities found. Please run 'pnpm audit fix' to fix them."
  echo "For manual review, run 'pnpm audit' to see the details."
else
  echo "No security vulnerabilities found."
fi

# Check for known vulnerable packages using snyk (if installed)
if command -v snyk &> /dev/null; then
  echo "Running Snyk security scan..."
  snyk test
else
  echo "Snyk is not installed. Consider installing it for more comprehensive security checks."
  echo "You can install it globally with: npm install -g snyk"
fi

echo "Security audit completed."
