# Base Stage
FROM node:20-alpine AS base

WORKDIR /app

# Install build tools for bcrypt and pnpm locally
RUN apk add --no-cache build-base python3

# Copy package manager files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@9.9.0 --activate
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy the rest of the source code
COPY . .

# Build for production
RUN pnpm run build

# Production Stage
FROM node:20-alpine AS production

# Use non-root user for production
RUN addgroup -g 1001 app && adduser -D -u 1001 -G app app
USER app

# Set working directory
WORKDIR /app

# Copy built artifacts and dependencies
COPY --from=base /app/dist /app/dist
COPY --from=base /app/node_modules /app/node_modules

# Expose production port
EXPOSE 4001

# Start the application
CMD ["node", "dist/src/app.js"]

# Development Stage
FROM base AS development

# Set working directory
WORKDIR /app

# Rebuild bcrypt native bindings
RUN pnpm rebuild bcrypt

# Expose port for development
EXPOSE 8080

# Run migrations before starting the application
CMD ["sh", "-c", "pnpm db:push && pnpm start:dev"]
