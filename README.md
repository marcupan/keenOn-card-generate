# KeenOn Card Generate

**KeenOn Card Generate** is a microservice-based application that provides functionality for generating Chinese learning cards. It consists of a central API written in Node.js that orchestrates two additional services: a Translation Service (Python) and an Image Composition Service (Rust).

## Overview

This project serves as a **central hub API** written in **Node.js**, connecting two additional services:

1. **Translation Service** (Python): Translates Chinese words and provides character breakdowns and example sentences.
2. **Image Composition Service** (Rust): Combines images with translated text to create visual learning cards.

All services communicate via **gRPC**, with the central API exposing user-friendly REST endpoints for external interaction.

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

## Why This Project?

As someone still learning backend development, this project is my way of applying knowledge in a practical, structured format. While it’s not a professional-grade application, it represents my commitment to understanding key concepts like:

- Service orchestration.
- Interoperability between programming languages.
- Efficient API design and communication protocols.

It’s an excellent learning milestone and a portfolio piece demonstrating my growing backend development skills.

## Technologies Used

- **Node.js**: Central API for orchestrating services.
- **Python**: Translation microservice.
- **Rust**: Image composition microservice.
- **gRPC**: Communication protocol between services.
- **Docker**: Containerized deployment for all services.

---

> **Note:** This project is not production-ready but is intended to demonstrate my learning progress in backend development.
