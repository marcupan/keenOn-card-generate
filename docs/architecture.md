# Architecture Documentation

This document provides a comprehensive overview of the KeenOn Card Generate service architecture, including its
components, interactions, and design patterns.

## System Overview

KeenOn Card Generate is a microservice-based application that provides functionality for generating Chinese learning
cards. It consists of three main services:

1. **Central Hub API (Node.js)** - The main service that orchestrates the other services and provides a REST API for
   clients.
2. **Translation Service (Python)** - A service that translates Chinese words and provides character breakdowns and
   example sentences.
3. **Image Composition Service (Rust)** - A service that combines images with translated text to create visual learning
   cards.

## Architecture Diagram

```
+------------------+           +------------------+
|                  |           |                  |
|  Client (Web/    |           |  Admin           |
|  Mobile)         |           |  Dashboard       |
|                  |           |                  |
+--------+---------+           +--------+---------+
         |                              |
         | HTTP/REST                    | HTTP/REST
         |                              |
+--------v------------------------------v---------+
|                                                 |
|           KeenOn Card Generate API              |
|           (Node.js + Express + TypeORM)         |
|                                                 |
+-----+-----------------------------------+-------+
      |                                   |
      | gRPC                              | gRPC
      |                                   |
+-----v--------------+       +------------v------+
|                    |       |                   |
| Translation Service|       | Image Composition |
| (Python)           |       | Service (Rust)    |
|                    |       |                   |
+--------------------+       +-------------------+
      |                              |
      | External API                 | Image Processing
      |                              |
+-----v--------------+       +-------v-----------+
|                    |       |                   |
| Dictionary APIs    |       | Image Storage     |
|                    |       |                   |
+--------------------+       +-------------------+
```

## Layered Architecture

The KeenOn Card Generate API follows a layered architecture pattern with clear separation of concerns:

```
+--------------------------------------------------+
|                                                  |
|                  Controllers                     |
|  (Handle HTTP requests and format responses)     |
|                                                  |
+--------------------------------------------------+
                        |
                        v
+--------------------------------------------------+
|                                                  |
|                   Services                       |
|  (Implement business logic and orchestration)    |
|                                                  |
+--------------------------------------------------+
                        |
                        v
+--------------------------------------------------+
|                                                  |
|                 Repositories                     |
|  (Handle data access and persistence)            |
|                                                  |
+--------------------------------------------------+
                        |
                        v
+--------------------------------------------------+
|                                                  |
|                   Entities                       |
|  (Define data models and validation)             |
|                                                  |
+--------------------------------------------------+
                        |
                        v
+--------------------------------------------------+
|                                                  |
|                   Database                       |
|  (PostgreSQL for persistent storage)             |
|                                                  |
+--------------------------------------------------+
```

## Component Descriptions

### Controllers

Controllers handle HTTP requests, validate input data, call appropriate services, and format responses. They are
organized by domain:

- **AuthController**: Handles user authentication (register, login, logout, refresh token)
- **UserController**: Manages user profiles and settings
- **CardController**: Handles card creation, retrieval, update, and deletion
- **FolderController**: Manages folder operations for organizing cards
- **AdminController**: Provides administrative functionality

### Services

Services implement business logic, orchestrate operations across multiple repositories, and handle communication with
external services:

- **AuthService**: Implements authentication logic
- **UserService**: Implements user management logic
- **CardService**: Implements card management and generation logic
- **FolderService**: Implements folder management logic
- **AuditService**: Logs important operations for auditing
- **ArchiveService**: Handles data archiving
- **BackupService**: Manages data backups

### Repositories

Repositories abstract data access operations and provide a clean interface for services to interact with the database:

- **UserRepository**: Handles user data operations
- **CardRepository**: Handles card data operations
- **FolderRepository**: Handles folder data operations

### Entities

Entities define the data models and validation rules:

- **User**: Represents a user account
- **Card**: Represents a learning card
- **Folder**: Represents a collection of cards

### Middleware

Middleware components process requests before they reach controllers:

- **Authentication**: Verifies user identity
- **Authorization**: Checks user permissions
- **Rate Limiting**: Prevents abuse
- **CSRF Protection**: Prevents cross-site request forgery
- **Validation**: Validates request data
- **Error Handling**: Processes and formats errors
- **Logging**: Records request and response information

## Communication Patterns

### REST API

The KeenOn Card Generate API exposes a RESTful interface for clients with the following characteristics:

- JSON request/response format
- JWT-based authentication
- Standardized error responses
- Resource-based URL structure
- HTTP methods for CRUD operations (GET, POST, PATCH, DELETE)

### gRPC Communication

Communication between the main API and microservices uses gRPC:

- Binary protocol based on Protocol Buffers
- High performance and low latency
- Strongly typed service definitions
- Bidirectional streaming capabilities
- Automatic code generation

## Data Flow

### Card Generation Flow

1. Client sends a request with a Chinese word and an image to the API
2. API validates the request and calls the Translation Service via gRPC
3. Translation Service returns the translation, character breakdown, and example sentences
4. API calls the Image Composition Service via gRPC with the image and translation data
5. Image Composition Service combines the image with the text and returns the composed image
6. API stores the card data in the database and returns the complete card to the client

## Security Architecture

The application implements several security measures:

- **Authentication**: JWT-based authentication with access and refresh tokens
- **Authorization**: Role-based access control
- **Data Protection**: Password hashing with bcrypt
- **CSRF Protection**: Token-based protection for state-changing operations
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Validates all input data to prevent injection attacks
- **Secure Headers**: Implements security headers with Helmet
- **IP Blocking**: Blocks suspicious IP addresses
- **Audit Logging**: Logs security-relevant events

## Deployment Architecture

The application is containerized using Docker and can be deployed in various environments:

```
+--------------------------------------------------+
|                                                  |
|                  Load Balancer                   |
|                                                  |
+--------------------------------------------------+
                        |
        +---------------+---------------+
        |               |               |
+-------v------+ +------v-------+ +-----v--------+
|              | |              | |              |
| API Instance | | API Instance | | API Instance |
|              | |              | |              |
+-------+------+ +------+-------+ +------+-------+
        |               |               |
        +---------------+---------------+
                        |
+--------------------------------------------------+
|                                                  |
|                  Database Cluster                |
|                                                  |
+--------------------------------------------------+
```

## Caching Strategy

The application uses a multi-level caching strategy:

1. **In-Memory Cache**: For frequently accessed data with short TTL
2. **Redis Cache**: For distributed caching across instances
3. **Database Query Cache**: For optimizing database queries
4. **Client-Side Cache**: Using HTTP cache headers

## Error Handling Strategy

The application implements a centralized error handling approach:

1. **Typed Errors**: Different error types for different scenarios
2. **Error Codes**: Standardized error codes for client interpretation
3. **Logging**: Detailed error logging for debugging
4. **Client-Friendly Messages**: User-friendly error messages without sensitive information

## Monitoring and Observability

The application includes several monitoring and observability features:

1. **Structured Logging**: JSON-formatted logs with context information
2. **Performance Metrics**: Response times, throughput, error rates
3. **Health Checks**: Endpoints for system health monitoring
4. **Tracing**: Request tracing across services
