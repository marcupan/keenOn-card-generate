# Authentication and Authorization Flows

This document describes the authentication and authorization processes implemented in the KeenOn Card Generate service, including user registration, login, token refresh, and access control mechanisms.

## Authentication Overview

The KeenOn Card Generate service uses a JWT (JSON Web Token) based authentication system with the following characteristics:

- **Access Tokens**: Short-lived tokens for API access
- **Refresh Tokens**: Longer-lived tokens for obtaining new access tokens
- **HTTP-Only Cookies**: Secure storage of tokens
- **CSRF Protection**: Prevention of cross-site request forgery attacks
- **Email Verification**: Ensuring valid user email addresses

## Authentication Flows

### User Registration Flow

```
+--------+                                +--------+                              +--------+
| Client |                                |  API   |                              | Email  |
+--------+                                +--------+                              +--------+
    |                                         |                                       |
    | 1. POST /api/auth/register              |                                       |
    | (name, email, password)                 |                                       |
    |---------------------------------------->|                                       |
    |                                         |                                       |
    |                                         | 2. Validate input                     |
    |                                         |---+                                   |
    |                                         |   |                                   |
    |                                         |<--+                                   |
    |                                         |                                       |
    |                                         | 3. Hash password                      |
    |                                         |---+                                   |
    |                                         |   |                                   |
    |                                         |<--+                                   |
    |                                         |                                       |
    |                                         | 4. Create user (verified=false)       |
    |                                         |---+                                   |
    |                                         |   |                                   |
    |                                         |<--+                                   |
    |                                         |                                       |
    |                                         | 5. Generate verification code         |
    |                                         |---+                                   |
    |                                         |   |                                   |
    |                                         |<--+                                   |
    |                                         |                                       |
    |                                         | 6. Send verification email            |
    |                                         |-------------------------------------->|
    |                                         |                                       |
    | 7. 201 Created                          |                                       |
    |<----------------------------------------|                                       |
    |                                         |                                       |
```

1. Client submits registration data (name, email, password)
2. API validates the input data
3. API hashes the password using bcrypt
4. API creates a new user with verified=false
5. API generates a verification code
6. API sends a verification email with the code
7. API returns a 201 Created response

### Email Verification Flow

```
+--------+                                +--------+
| Client |                                |  API   |
+--------+                                +--------+
    |                                         |
    | 1. GET /api/auth/verifyemail/{code}     |
    |---------------------------------------->|
    |                                         |
    |                                         | 2. Validate verification code
    |                                         |---+
    |                                         |   |
    |                                         |<--+
    |                                         |
    |                                         | 3. Update user (verified=true)
    |                                         |---+
    |                                         |   |
    |                                         |<--+
    |                                         |
    | 4. 200 OK                               |
    |<----------------------------------------|
    |                                         |
```

1. Client accesses the verification URL from the email
2. API validates the verification code
3. API updates the user to verified=true
4. API returns a 200 OK response

### Login Flow

```
+--------+                                +--------+                              +--------+
| Client |                                |  API   |                              | Redis  |
+--------+                                +--------+                              +--------+
    |                                         |                                       |
    | 1. POST /api/auth/login                 |                                       |
    | (email, password)                       |                                       |
    |---------------------------------------->|                                       |
    |                                         |                                       |
    |                                         | 2. Validate credentials               |
    |                                         |---+                                   |
    |                                         |   |                                   |
    |                                         |<--+                                   |
    |                                         |                                       |
    |                                         | 3. Generate access & refresh tokens   |
    |                                         |---+                                   |
    |                                         |   |                                   |
    |                                         |<--+                                   |
    |                                         |                                       |
    |                                         | 4. Store user session in Redis        |
    |                                         |-------------------------------------->|
    |                                         |                                       |
    | 5. 200 OK + HTTP-only cookies           |                                       |
    | (access_token, refresh_token, logged_in)|                                       |
    |<----------------------------------------|                                       |
    |                                         |                                       |
```

1. Client submits login credentials (email, password)
2. API validates the credentials
3. API generates access and refresh tokens
4. API stores the user session in Redis
5. API returns a 200 OK response with HTTP-only cookies

### Token Refresh Flow

```
+--------+                                +--------+                              +--------+
| Client |                                |  API   |                              | Redis  |
+--------+                                +--------+                              +--------+
    |                                         |                                       |
    | 1. GET /api/auth/refresh                |                                       |
    | (with refresh_token cookie)             |                                       |
    |---------------------------------------->|                                       |
    |                                         |                                       |
    |                                         | 2. Validate refresh token             |
    |                                         |---+                                   |
    |                                         |   |                                   |
    |                                         |<--+                                   |
    |                                         |                                       |
    |                                         | 3. Check session in Redis             |
    |                                         |-------------------------------------->|
    |                                         |                                       |
    |                                         | 4. Session data                       |
    |                                         |<--------------------------------------|
    |                                         |                                       |
    |                                         | 5. Generate new access token          |
    |                                         |---+                                   |
    |                                         |   |                                   |
    |                                         |<--+                                   |
    |                                         |                                       |
    | 6. 200 OK + new access_token cookie     |                                       |
    |<----------------------------------------|                                       |
    |                                         |                                       |
```

1. Client sends a refresh request with the refresh_token cookie
2. API validates the refresh token
3. API checks for a valid session in Redis
4. Redis returns the session data
5. API generates a new access token
6. API returns a 200 OK response with a new access_token cookie

### Logout Flow

```
+--------+                                +--------+                              +--------+
| Client |                                |  API   |                              | Redis  |
+--------+                                +--------+                              +--------+
    |                                         |                                       |
    | 1. GET /api/auth/logout                 |                                       |
    | (with access_token cookie)              |                                       |
    |---------------------------------------->|                                       |
    |                                         |                                       |
    |                                         | 2. Validate access token              |
    |                                         |---+                                   |
    |                                         |   |                                   |
    |                                         |<--+                                   |
    |                                         |                                       |
    |                                         | 3. Delete session from Redis          |
    |                                         |-------------------------------------->|
    |                                         |                                       |
    | 4. 200 OK + clear cookies               |                                       |
    | (access_token, refresh_token, logged_in)|                                       |
    |<----------------------------------------|                                       |
    |                                         |                                       |
```

1. Client sends a logout request with the access_token cookie
2. API validates the access token
3. API deletes the session from Redis
4. API returns a 200 OK response with cleared cookies

## Authorization

### Role-Based Access Control

The KeenOn Card Generate service implements role-based access control (RBAC) with the following roles:

- **User**: Regular user with access to their own resources
- **Admin**: Administrator with access to all resources and administrative functions

### Access Control Implementation

Access control is implemented at multiple levels:

1. **Middleware Level**: The `requireUser` middleware ensures that a user is authenticated before accessing protected routes.

2. **Controller Level**: Controllers check if the authenticated user has permission to access the requested resource.

3. **Service Level**: Services implement business rules for access control.

### Resource Ownership

Resource ownership is enforced for user-created resources:

- Users can only access their own cards and folders
- Users cannot access or modify resources owned by other users
- Admins can access and modify all resources

### CSRF Protection

To prevent cross-site request forgery attacks, the service implements token-based CSRF protection:

1. Client requests a CSRF token via GET /api/auth/csrf-token
2. Server generates a token and sets it in a cookie
3. Client includes the token in the header for all state-changing requests (POST, PUT, PATCH, DELETE)
4. Server validates the token before processing the request

## Security Measures

### Password Security

- Passwords are hashed using bcrypt with a cost factor of 12
- Password requirements are enforced (minimum length, complexity)
- Failed login attempts are tracked and limited

### Token Security

- Access tokens expire after a short period (default: 15 minutes)
- Refresh tokens expire after a longer period (default: 7 days)
- Tokens are stored in HTTP-only cookies to prevent JavaScript access
- Secure flag is set in production to ensure HTTPS-only transmission

### Rate Limiting

Rate limiting is applied to authentication endpoints to prevent brute force attacks:

- Registration: 3 requests per 15 minutes per IP
- Login: 5 requests per 15 minutes per IP
- Email verification: 3 requests per hour per IP

### IP Blocking

Suspicious activity triggers IP blocking:

- Multiple failed login attempts
- Attempting to access unauthorized resources
- Sending malformed requests

## Session Management

### Session Storage

User sessions are stored in Redis with the following characteristics:

- User ID as the key
- User data as the value
- TTL matching the refresh token expiration

### Session Invalidation

Sessions are invalidated in the following cases:

- User logs out
- User changes password
- Admin forcibly logs out a user
- Session expires

## Error Handling

Authentication and authorization errors return appropriate HTTP status codes:

- 400 Bad Request: Invalid input data
- 401 Unauthorized: Missing or invalid authentication
- 403 Forbidden: Valid authentication but insufficient permissions
- 429 Too Many Requests: Rate limit exceeded
