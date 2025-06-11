# API User Guide

This document provides guidance for developers who want to use the KeenOn Card Generate API. It includes examples of common operations, best practices, and troubleshooting tips.

## Getting Started

### Base URL

The base URL for all API endpoints is:

- Development: `http://localhost:3000/api`
- Production: `https://api.keenon-card-generate.example.com/api`

### Authentication

Most API endpoints require authentication. To authenticate:

1. Register a user account
2. Verify your email address
3. Log in to obtain authentication tokens (stored as cookies)
4. Include cookies in subsequent requests

### Request/Response Format

- All requests and responses use JSON format
- Content-Type header should be set to `application/json`
- Successful responses include a `status` field with value `success`
- Error responses include a `status` field with value `error` and a `message` field

## Common Operations

### User Management

#### Register a New User

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "Password123!",
  "passwordConfirm": "Password123!"
}
```

Response:

```json
{
	"status": "success",
	"message": "An email with a verification code has been sent to your email"
}
```

#### Verify Email

```http
GET /api/auth/verifyemail/1234567890abcdef
```

Response:

```json
{
	"status": "success",
	"message": "Email verified successfully"
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "Password123!"
}
```

Response:

```json
{
	"status": "success",
	"user": {
		"name": "John Doe",
		"email": "john.doe@example.com"
	}
}
```

The response will also set the following cookies:

- `access_token`: JWT access token
- `refresh_token`: JWT refresh token
- `logged_in`: Boolean flag indicating login status

#### Get Current User

```http
GET /api/users/me
```

Response:

```json
{
	"status": "success",
	"data": {
		"id": "123e4567-e89b-12d3-a456-426614174000",
		"name": "John Doe",
		"email": "john.doe@example.com",
		"verified": true,
		"role": "user",
		"createdAt": "2023-01-01T00:00:00Z",
		"updatedAt": "2023-01-01T00:00:00Z"
	}
}
```

#### Logout

```http
GET /api/auth/logout
```

Response:

```json
{
	"status": "success"
}
```

The response will also clear the authentication cookies.

### Card Management

#### Get CSRF Token (Required for State-Changing Operations)

```http
GET /api/auth/csrf-token
```

Response:

```json
{
	"status": "success"
}
```

The response will set a `_csrf` cookie.

#### Create a Card

```http
POST /api/cards
Content-Type: application/json
csrf-token: <token-from-cookie>

{
  "word": "你好",
  "translation": "Hello",
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "folderId": "123e4567-e89b-12d3-a456-426614174000"
}
```

Response:

```json
{
	"status": "success",
	"data": {
		"id": "123e4567-e89b-12d3-a456-426614174001",
		"word": "你好",
		"translation": "Hello",
		"image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
		"sentence": "你好吗?",
		"createdAt": "2023-01-01T00:00:00Z",
		"updatedAt": "2023-01-01T00:00:00Z"
	}
}
```

#### Generate a Card

```http
POST /api/cards/generate
Content-Type: application/json
csrf-token: <token-from-cookie>

{
  "word": "你好",
  "imageBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

Response:

```json
{
	"status": "success",
	"data": {
		"image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
		"translation": "Hello",
		"characterBreakdown": ["你 - you", "好 - good"],
		"exampleSentences": ["你好吗? - How are you?"]
	}
}
```

#### Get All Cards

```http
GET /api/cards?page=1&limit=10
```

Response:

```json
{
	"status": "success",
	"results": 10,
	"data": [
		{
			"id": "123e4567-e89b-12d3-a456-426614174001",
			"word": "你好",
			"translation": "Hello",
			"image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
			"sentence": "你好吗?",
			"createdAt": "2023-01-01T00:00:00Z",
			"updatedAt": "2023-01-01T00:00:00Z"
		}
		// More cards...
	]
}
```

#### Get a Specific Card

```http
GET /api/cards/123e4567-e89b-12d3-a456-426614174001
```

Response:

```json
{
	"status": "success",
	"data": {
		"id": "123e4567-e89b-12d3-a456-426614174001",
		"word": "你好",
		"translation": "Hello",
		"image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
		"sentence": "你好吗?",
		"createdAt": "2023-01-01T00:00:00Z",
		"updatedAt": "2023-01-01T00:00:00Z"
	}
}
```

#### Update a Card

```http
PATCH /api/cards/123e4567-e89b-12d3-a456-426614174001
Content-Type: application/json
csrf-token: <token-from-cookie>

{
  "translation": "Hello (updated)",
  "folderId": "123e4567-e89b-12d3-a456-426614174002"
}
```

Response:

```json
{
	"status": "success",
	"data": {
		"id": "123e4567-e89b-12d3-a456-426614174001",
		"word": "你好",
		"translation": "Hello (updated)",
		"image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
		"sentence": "你好吗?",
		"createdAt": "2023-01-01T00:00:00Z",
		"updatedAt": "2023-01-01T00:00:00Z"
	}
}
```

#### Delete a Card

```http
DELETE /api/cards/123e4567-e89b-12d3-a456-426614174001
csrf-token: <token-from-cookie>
```

Response:

```
204 No Content
```

### Folder Management

#### Create a Folder

```http
POST /api/folders
Content-Type: application/json
csrf-token: <token-from-cookie>

{
  "name": "Chinese Basics",
  "description": "Basic Chinese vocabulary"
}
```

Response:

```json
{
	"status": "success",
	"data": {
		"id": "123e4567-e89b-12d3-a456-426614174002",
		"name": "Chinese Basics",
		"description": "Basic Chinese vocabulary",
		"createdAt": "2023-01-01T00:00:00Z",
		"updatedAt": "2023-01-01T00:00:00Z"
	}
}
```

#### Get All Folders

```http
GET /api/folders
```

Response:

```json
{
	"status": "success",
	"data": [
		{
			"id": "123e4567-e89b-12d3-a456-426614174002",
			"name": "Chinese Basics",
			"description": "Basic Chinese vocabulary",
			"createdAt": "2023-01-01T00:00:00Z",
			"updatedAt": "2023-01-01T00:00:00Z"
		}
		// More folders...
	]
}
```

#### Get a Specific Folder

```http
GET /api/folders/123e4567-e89b-12d3-a456-426614174002
```

Response:

```json
{
	"status": "success",
	"data": {
		"id": "123e4567-e89b-12d3-a456-426614174002",
		"name": "Chinese Basics",
		"description": "Basic Chinese vocabulary",
		"cards": [
			{
				"id": "123e4567-e89b-12d3-a456-426614174001",
				"word": "你好",
				"translation": "Hello",
				"image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
				"sentence": "你好吗?",
				"createdAt": "2023-01-01T00:00:00Z",
				"updatedAt": "2023-01-01T00:00:00Z"
			}
			// More cards...
		],
		"createdAt": "2023-01-01T00:00:00Z",
		"updatedAt": "2023-01-01T00:00:00Z"
	}
}
```

#### Update a Folder

```http
PATCH /api/folders/123e4567-e89b-12d3-a456-426614174002
Content-Type: application/json
csrf-token: <token-from-cookie>

{
  "name": "Chinese Basics (updated)",
  "description": "Updated description"
}
```

Response:

```json
{
	"status": "success",
	"data": {
		"id": "123e4567-e89b-12d3-a456-426614174002",
		"name": "Chinese Basics (updated)",
		"description": "Updated description",
		"createdAt": "2023-01-01T00:00:00Z",
		"updatedAt": "2023-01-01T00:00:00Z"
	}
}
```

#### Delete a Folder

```http
DELETE /api/folders/123e4567-e89b-12d3-a456-426614174002
csrf-token: <token-from-cookie>
```

Response:

```
204 No Content
```

## Pagination

For endpoints that return multiple items, pagination is supported with the following query parameters:

- `page`: Page number (default: 1)
- `limit`: Number of items per page (default: 10)

Example:

```http
GET /api/cards?page=2&limit=20
```

Response includes pagination information:

```json
{
	"status": "success",
	"results": 20,
	"data": [
		// Items...
	]
}
```

## Filtering

Some endpoints support filtering:

### Cards

- `folderId`: Filter cards by folder ID

Example:

```http
GET /api/cards?folderId=123e4567-e89b-12d3-a456-426614174002
```

## Error Handling

### Common Error Codes

| Status Code | Error Code            | Description                                       |
| ----------- | --------------------- | ------------------------------------------------- |
| 400         | BAD_REQUEST           | Invalid input data                                |
| 401         | UNAUTHORIZED          | Missing or invalid authentication                 |
| 403         | FORBIDDEN             | Valid authentication but insufficient permissions |
| 404         | NOT_FOUND             | Resource not found                                |
| 409         | CONFLICT              | Resource already exists                           |
| 429         | TOO_MANY_REQUESTS     | Rate limit exceeded                               |
| 500         | INTERNAL_SERVER_ERROR | Server error                                      |

### Error Response Format

```json
{
	"status": "error",
	"message": "Error message",
	"code": "ERROR_CODE"
}
```

## Best Practices

### Authentication

- Store authentication cookies securely
- Refresh the access token when it expires
- Include CSRF token for all state-changing operations

### Performance

- Use pagination for large result sets
- Request only the data you need
- Cache responses when appropriate

### Error Handling

- Implement proper error handling on the client side
- Retry failed requests with exponential backoff
- Display user-friendly error messages

## Rate Limiting

The API implements rate limiting to prevent abuse. If you exceed the rate limits, you'll receive a 429 Too Many Requests response.

To avoid rate limiting:

- Cache responses when possible
- Implement retry logic with exponential backoff
- Batch operations when possible

## Troubleshooting

### Common Issues

#### Authentication Failures

- Ensure cookies are being sent with requests
- Check if the access token has expired
- Verify that the email address has been verified

#### CSRF Protection Errors

- Request a new CSRF token
- Include the token in the csrf-token header
- Ensure the token hasn't expired

#### Rate Limiting

- Implement exponential backoff
- Cache responses to reduce the number of requests
- Contact support if you need higher rate limits

### Getting Help

If you encounter issues not covered in this guide:

- Check the API documentation
- Review the error message and code
- Contact support with detailed information about the issue
