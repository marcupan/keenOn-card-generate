# Error Codes Documentation

This document provides a comprehensive list of error codes used in the KeenOn Card Generate service, along with their meanings, when they occur, and how to handle them.

## Error Response Format

All API error responses follow a consistent format:

```json
{
	"status": "error",
	"message": "A human-readable error message",
	"code": "ERROR_CODE",
	"details": {
		// Optional additional information about the error
	}
}
```

- `status`: Always "error" for error responses
- `message`: A human-readable description of the error
- `code`: A machine-readable error code (see below)
- `details`: Optional object with additional information about the error (only included when relevant)
- `stack`: Stack trace (only included in development environment)
- `requestId`: Unique identifier for the request (for tracking and debugging)

## HTTP Status Codes and Error Codes

| HTTP Status | Error Code            | Description                                             | Possible Causes                                                  | Handling Strategy                                                        |
| ----------- | --------------------- | ------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 400         | BAD_REQUEST           | The request contains invalid parameters or is malformed | Missing required fields, invalid data format, invalid parameters | Check the request data and correct any errors                            |
| 400         | VALIDATION_ERROR      | The request data failed validation                      | Data doesn't meet validation rules (e.g., password too short)    | Check the `details` field for specific validation errors and fix them    |
| 401         | UNAUTHORIZED          | Authentication is required or credentials are invalid   | Missing or expired token, invalid credentials                    | Re-authenticate the user or redirect to login                            |
| 403         | FORBIDDEN             | The authenticated user doesn't have permission          | User lacks necessary permissions, CSRF token missing or invalid  | Check user permissions or request a new CSRF token                       |
| 404         | NOT_FOUND             | The requested resource doesn't exist                    | Invalid ID, deleted resource, typo in URL                        | Check the resource ID or inform the user that the resource doesn't exist |
| 409         | CONFLICT              | The request conflicts with the current state            | Duplicate entry, concurrent modification                         | Resolve the conflict or retry with updated data                          |
| 429         | TOO_MANY_REQUESTS     | Rate limit exceeded                                     | Too many requests in a short time period                         | Implement exponential backoff and retry after the specified time         |
| 500         | INTERNAL_SERVER_ERROR | An unexpected error occurred on the server              | Bug in the application, database error                           | Report the error and retry later                                         |
| 503         | SERVICE_UNAVAILABLE   | The service is temporarily unavailable                  | Server overload, maintenance                                     | Retry after a delay with exponential backoff                             |
| 504         | GATEWAY_TIMEOUT       | A timeout occurred while processing the request         | Slow external service, network issues                            | Retry the request                                                        |

## Detailed Error Code Descriptions

### BAD_REQUEST

This error occurs when the request is malformed or contains invalid parameters.

**Examples:**

- Missing required fields in the request body
- Invalid data format (e.g., malformed JSON)
- Invalid query parameters
- Invalid ID format

**Handling:**

- Check the error message for details about what's wrong with the request
- Validate request data before sending
- Ensure all required fields are included
- Check parameter formats and constraints

### VALIDATION_ERROR

This error occurs when the request data fails validation rules.

**Examples:**

- Password doesn't meet complexity requirements
- Email address is invalid
- String length exceeds maximum
- Number is outside allowed range

**Handling:**

- Check the `details` field for specific validation errors
- Display appropriate error messages to the user
- Implement client-side validation to catch errors before sending requests

### UNAUTHORIZED

This error occurs when authentication is required or the provided credentials are invalid.

**Examples:**

- Missing authentication token
- Expired token
- Invalid credentials
- User not verified

**Handling:**

- Redirect the user to the login page
- Refresh the access token if possible
- Clear invalid credentials and prompt for re-authentication
- Guide the user to verify their email if needed

### FORBIDDEN

This error occurs when the authenticated user doesn't have permission to perform the requested action.

**Examples:**

- User trying to access another user's resources
- Non-admin user trying to access admin features
- Missing CSRF token for state-changing operations
- IP address blocked due to suspicious activity

**Handling:**

- Inform the user they don't have permission
- Request a new CSRF token if needed
- Hide UI elements that the user doesn't have permission to use
- Provide guidance on how to get the necessary permissions

### NOT_FOUND

This error occurs when the requested resource doesn't exist.

**Examples:**

- Invalid resource ID
- Resource has been deleted
- Typo in the URL
- Resource exists but is not accessible to the user

**Handling:**

- Inform the user that the resource doesn't exist
- Provide navigation options to valid resources
- Check for typos in the resource ID
- Implement 404 pages with helpful information

### CONFLICT

This error occurs when the request conflicts with the current state of the server.

**Examples:**

- Trying to create a resource with a unique field that already exists
- Concurrent modification of the same resource
- Trying to delete a resource that is referenced by other resources

**Handling:**

- Inform the user about the conflict
- Provide options to resolve the conflict
- Refresh the data and retry the operation
- Implement optimistic concurrency control for important operations

### TOO_MANY_REQUESTS

This error occurs when the client has sent too many requests in a given amount of time.

**Examples:**

- Exceeding the rate limit for authentication endpoints
- Sending too many requests to the API in a short time
- Automated scripts without proper rate limiting

**Handling:**

- Implement exponential backoff and retry mechanism
- Cache responses to reduce the number of requests
- Batch operations when possible
- Display appropriate messages to the user

### INTERNAL_SERVER_ERROR

This error occurs when an unexpected error happens on the server.

**Examples:**

- Unhandled exceptions in the application code
- Database errors
- External service failures
- Configuration issues

**Handling:**

- Log the error and report it to the development team
- Display a generic error message to the user
- Implement retry logic with exponential backoff
- Monitor for patterns of errors

### SERVICE_UNAVAILABLE

This error occurs when the service is temporarily unavailable.

**Examples:**

- Server is overloaded
- Maintenance is in progress
- Dependent services are down

**Handling:**

- Retry the request after a delay
- Implement circuit breaker pattern
- Display appropriate messages to the user
- Provide alternative functionality if possible

### GATEWAY_TIMEOUT

This error occurs when a timeout happens while processing the request.

**Examples:**

- External service is slow or unresponsive
- Network issues
- Complex operations taking too long

**Handling:**

- Retry the request
- Implement timeouts for all external calls
- Consider breaking down complex operations
- Monitor performance of external dependencies

### FEATURE_NOT_ENABLED

This error occurs when the client tries to use a feature that is not enabled.

**Examples:**

- Feature flag is turned off
- Beta feature not available to the user
- Feature available only in certain environments

**Handling:**

- Hide UI elements for disabled features
- Inform the user that the feature is not available
- Provide information about when the feature might be available
- Check feature flags before making requests

### UNSUPPORTED_API_VERSION

This error occurs when the client uses an unsupported API version.

**Examples:**

- Using a deprecated API version
- Using a version that doesn't exist
- Missing version information

**Handling:**

- Update the client to use a supported API version
- Check API documentation for version compatibility
- Include proper version headers in requests
- Implement version negotiation in the client

## Error Handling Best Practices

1. **Implement proper error handling on the client side**

    - Catch and handle all errors
    - Display user-friendly error messages
    - Log errors for debugging

2. **Use the error code for programmatic handling**

    - Switch on the error code rather than the message
    - Implement specific handling for each error code
    - Fall back to generic handling for unexpected errors

3. **Retry with exponential backoff for transient errors**

    - Identify which errors are transient (e.g., TOO_MANY_REQUESTS, SERVICE_UNAVAILABLE)
    - Implement exponential backoff with jitter
    - Set maximum retry limits

4. **Validate input before sending requests**

    - Implement client-side validation
    - Check required fields and formats
    - Provide immediate feedback to users

5. **Handle authentication errors gracefully**

    - Redirect to login when authentication is required
    - Refresh tokens when possible
    - Preserve user input when redirecting

6. **Log errors for monitoring and debugging**

    - Include request ID in logs
    - Monitor error rates and patterns
    - Set up alerts for critical errors

7. **Provide helpful error messages to users**
    - Translate error codes to user-friendly messages
    - Suggest actions to resolve the error
    - Avoid technical jargon in user-facing messages
