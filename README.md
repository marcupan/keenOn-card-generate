# KeenOn Card Generate

**KeenOn Card Generate** is a **study project** designed to explore and demonstrate microservice architecture concepts. It showcases my learning journey in backend development by integrating multiple technologies and languages into a cohesive system.

## Overview

This project serves as a **central hub API** written in **Node.js**, connecting two additional services:
1. **Translation Service** (Python): Translates text for Chinese learning cards.
2. **Image Composition Service** (Rust): Creates visuals by combining translated text with images.

All services communicate via **gRPC**, with the central API exposing user-friendly REST endpoints for external interaction.

## Key Features
- **Microservice Architecture**: Designed to demonstrate service separation and communication.
- **Multilingual Stack**: Node.js (main hub), Python (translation), and Rust (image composition).
- **gRPC Communication**: Efficient and robust service-to-service communication.
- **REST API**: Exposes accessible endpoints for interacting with the system.

## Why This Project?

As someone still learning backend development, this project is my way of applying knowledge in a practical, structured format. While it’s not a professional-grade application, it represents my commitment to understanding key concepts like:
- Service orchestration.
- Interoperability between programming languages.
- Efficient API design and communication protocols.

It’s an excellent learning milestone and a portfolio piece to demonstrate my growing skills in backend development.

## Technologies Used
- **Node.js**: Central API for orchestrating services.
- **Python**: Translation microservice.
- **Rust**: Image composition microservice.
- **gRPC**: Communication protocol between services.
- **Docker**: Containerized deployment for all services.

---

> **Note:** This project is not production-ready but is intended as a demonstration of my learning progress in backend development.
