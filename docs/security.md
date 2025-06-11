# Security Features Documentation

This document outlines the security features implemented in the keenOn-card-generate service.

## Authentication Security

### Rate Limiting

Rate limiting has been implemented to protect authentication endpoints from brute force attacks:

- **Login and Registration**: Limited to 5 requests per 15 minutes per IP address
- **Email Verification**: Limited to 3 requests per hour per IP address

### IP-Based Blocking

The service implements IP-based blocking for suspicious activity:

- IPs with 5 or more failed login attempts within 24 hours are blocked for 1 hour
- IPs with suspicious activity patterns (more than 10 requests per minute) are automatically blocked for 1 hour
- Failed login attempts are tracked and reset upon successful login

### Password Security

Password security has been enhanced with the following requirements:

- Minimum length of 8 characters
- Maximum length of 32 characters
- Must contain at least one uppercase letter
- Must contain at least one lowercase letter
- Must contain at least one number
- Must contain at least one special character (@$!%\*?&)

## CSRF Protection

Cross-Site Request Forgery (CSRF) protection has been implemented for all state-changing operations:

- A CSRF token is required for all POST, PUT, PATCH, and DELETE requests
- The token is provided via a cookie and must be included in the request header
- A dedicated endpoint `/api/auth/csrf-token` is available to obtain a CSRF token

Protected routes include:

- User registration
- User logout
- Card creation, update, and deletion
- Folder creation, update, and deletion

## Security Headers

The following security headers have been implemented using Helmet:

- **Content-Security-Policy**: Restricts the sources from which content can be loaded
- **X-XSS-Protection**: Enables browser's XSS filtering
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **Strict-Transport-Security**: Enforces HTTPS connections
- **X-Frame-Options**: Prevents clickjacking by disallowing framing
- **Referrer-Policy**: Controls the information sent in the Referer header
- **Feature-Policy**: Restricts which browser features can be used

## Input Validation

All API endpoints implement strict input validation using Zod schemas:

- Request parameters, query strings, and body are validated
- Validation errors return a 400 status code with detailed error information
- Custom validation rules are applied for specific fields (e.g., password strength)

## Error Handling

Error handling has been improved to prevent information leakage:

- Generic error messages are used in production
- Detailed error information is only available in development
- Database errors are sanitized to prevent SQL query exposure
- Authentication errors don't reveal specific reasons for failure

## Dependency Security

Regular security audits for dependencies are set up:

- A security audit script (`scripts/security-audit.sh`) checks for vulnerabilities
- The script runs automatically before production deployment
- It checks for outdated packages and known vulnerabilities
- Integration with Snyk (if installed) for deeper vulnerability scanning

## Best Practices

- Cookies are set with appropriate security flags (HttpOnly, Secure, SameSite)
- Authentication tokens have appropriate expiration times
- Redis is used for session management with proper TTL settings
- Database queries use parameterized statements to prevent SQL injection
