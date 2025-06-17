# Build stage
FROM node:20.11.1-alpine AS builder
WORKDIR /app

# Install necessary build tools and dependencies
RUN apk add --no-cache \
    build-base \
    python3 \
    gcc \
    g++ \
    make \
    python3-dev

# Enable pnpm
RUN corepack enable && \
    corepack prepare pnpm@9.9.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Development stage
FROM node:20.11.1-alpine AS development
WORKDIR /app

# Install necessary tools for development
RUN apk add --no-cache \
    build-base \
    python3 \
    postgresql-client \
    gcc \
    g++ \
    make \
    python3-dev

# Enable pnpm and install global dependencies
RUN corepack enable && \
    corepack prepare pnpm@9.9.0 --activate && \
    npm install -g typescript ts-node tsconfig-paths node-pre-gyp

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies with native build
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Rebuild bcrypt without additional installation
RUN cd node_modules/bcrypt && node-pre-gyp install --fallback-to-build

EXPOSE 4000

# Modify the startup command
CMD ["sh", "-c", "./wait-for-db.sh && pnpm db:push && pnpm start:dev"]

# Production stage - using a smaller base image
FROM node:20.11.1-alpine AS production
WORKDIR /app

# Install only the necessary runtime dependencies
RUN apk add --no-cache \
    postgresql-client

# Create a non-root user
RUN addgroup -g 1001 app && adduser -D -u 1001 -G app app

# Enable pnpm
RUN corepack enable && \
    corepack prepare pnpm@9.9.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY wait-for-db.sh ./wait-for-db.sh

# Set permissions and switch to non-root user
RUN chmod +x ./wait-for-db.sh && \
    chown -R app:app /app
USER app

# Set environment variables
ENV NODE_ENV=production

EXPOSE 4000

# Start the application
CMD ["sh", "-c", "./wait-for-db.sh && node dist/src/app.js"]
