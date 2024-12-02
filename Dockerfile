# Base Image for Dependencies
FROM node:20-slim AS base

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@9.9.0

# Install build tools for bcrypt compilation (required for native dependencies)
RUN apt-get update && apt-get install -y build-essential python3 make g++

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies without running optional scripts
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy the rest of the application code
COPY . .

# Build the application (for production)
RUN pnpm run build


# Production Image
FROM node:20-slim AS production

# Set working directory
WORKDIR /app

# Copy dependencies and built files from the base stage
COPY --from=base /app/node_modules /app/node_modules
COPY --from=base /app/dist /app/dist

# Install pnpm globally (needed for running production scripts)
RUN npm install -g pnpm@9.9.0

# Expose port
EXPOSE 4001

# Start the application
CMD ["node", "dist/src/app.js"]


# Development Image
FROM base AS development

# Set working directory
WORKDIR /app

# Install build tools for bcrypt compilation (required in development too)
RUN apt-get update && apt-get install -y build-essential python3 make g++

# Rebuild bcrypt to make sure native bindings are built correctly
RUN pnpm rebuild bcrypt

# Expose port for development
EXPOSE 8080

# Start the application in development mode
CMD ["pnpm", "start:dev"]
