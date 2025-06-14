# KeenOn Card Generate

**KeenOn Card Generate** is a microservice-based application that provides functionality for generating Chinese learning
cards. It consists of a central API written in Node.js that orchestrates two additional services: a Translation
Service (Python) and an Image Composition Service (Rust).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This project serves as a **central hub API** written in **Node.js**, connecting two additional services:

1. **Translation Service** (Python): Translates Chinese words and provides character breakdowns and example sentences.
2. **Image Composition Service** (Rust): Combines images with translated text to create visual learning cards.

All services communicate via **gRPC**, with the central API exposing user-friendly REST endpoints for external
interaction.

## Key Features

- **Microservice Architecture**: Designed with clear service boundaries and communication.
- **Multilingual Stack**: Node.js (main hub), Python (translation), and Rust (image composition).
- **gRPC Communication**: Efficient and robust service-to-service communication.
- **REST API**: Exposes accessible endpoints for system interaction.
- **Authentication**: JWT-based authentication with refresh tokens.
- **Database**: PostgreSQL with TypeORM for data persistence.
- **Caching**: Redis for session storage and caching.
- **Security**: CSRF protection, rate limiting, and input validation.
- **Documentation**: Comprehensive API and code documentation.

## Documentation

- [API Documentation](docs/openapi.yaml): OpenAPI/Swagger documentation for the REST API.
- [Database Schema](docs/database-schema.md): Documentation of the database schema and relationships.
- [Architecture](docs/architecture.md): Overview of the system architecture and components.
- [Authentication Flows](docs/auth-flows.md): Documentation of authentication and authorization processes.
- [API User Guide](docs/api-guide.md): Guide for developers using the API.
- [Error Codes](docs/error-codes.md): Documentation of error codes and their meanings.
- [Contributing Guidelines](docs/contributing.md): Guidelines for contributing to the project.

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or pnpm
- Docker and Docker Compose (recommended)
- PostgreSQL (if not using Docker)
- Redis (if not using Docker)

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/your-username/keenOn-card-generate.git
    cd keenOn-card-generate
    ```

2. Install dependencies:

    ```bash
    pnpm install
    ```

3. Set up environment variables:

    ```bash
    cp .env.example .env
    ```

    Edit the `.env` file with your configuration.

4. Start the development environment:

    ```bash
    docker-compose up -d
    ```

5. Run database migrations:

    ```bash
    pnpm run migrate
    ```

6. Start the development server:
    ```bash
    pnpm run dev
    ```

The API will be available at http://localhost:3000/api.

### Running Tests

```bash
# Run all tests
pnpm run test

# Run tests with coverage
pnpm run test:coverage
```

### Building for Production

```bash
# Build the application
pnpm run build

# Start the production server
pnpm run start
```

## Project Structure

```
keenOn-card-generate/
├── config/               # Configuration files
├── dist/                 # Compiled output
├── docs/                 # Documentation
├── logs/                 # Log files
├── proto/                # Protocol Buffers definitions
├── scripts/              # Utility scripts
├── src/
│   ├── controller/       # API controllers
│   ├── entities/         # Database entities
│   ├── middleware/       # Express middleware
│   ├── migrations/       # Database migrations
│   ├── repository/       # Data access layer
│   ├── routes/           # API routes
│   ├── schema/           # Validation schemas
│   ├── service/          # Business logic
│   ├── types/            # TypeScript type definitions
│   ├── upload/           # File upload handling
│   ├── utils/            # Utility functions
│   ├── views/            # View templates
│   └── app.ts            # Application entry point
├── .env.example          # Example environment variables
├── .eslintrc.js          # ESLint configuration
├── .gitignore            # Git ignore file
├── docker-compose.yml    # Docker Compose configuration
├── Dockerfile            # Docker configuration
├── package.json          # Project dependencies
├── README.md             # Project documentation
└── tsconfig.json         # TypeScript configuration
```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](docs/contributing.md) for details on how to get
started.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Thanks to all contributors who have helped shape this project.
- Special thanks to the open-source community for the amazing tools and libraries that make this project possible.

---

> **Note:** This project started as a study project to explore microservice architecture concepts and has evolved into a
> more comprehensive application.
