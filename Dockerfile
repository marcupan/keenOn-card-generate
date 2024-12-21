# Base Stage
FROM node:20-alpine AS base

WORKDIR /app

# Install build tools for bcrypt and pnpm locally
RUN apk add --no-cache build-base python3

# Copy package manager files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@9.9.0 --activate
RUN pnpm install --frozen-lockfile --ignore-scripts

# Rebuild bcrypt in the base stage to avoid issues later
RUN pnpm rebuild bcrypt

# Copy the rest of the source code
COPY . .

# Build the project
RUN pnpm run build  # Ensure this generates /app/dist

# Development Stage
FROM base AS development

# Expose a development-specific port
EXPOSE 4000

# Start the development server
CMD ["pnpm", "run", "start:dev"]

# Production Stage
FROM node:20-alpine AS production

# Use non-root user for production
RUN addgroup -g 1001 app && adduser -D -u 1001 -G app app
USER app

WORKDIR /app

# Copy built artifacts and dependencies
COPY --from=base /app/dist /app/dist
COPY --from=base /app/node_modules /app/node_modules
COPY --from=base /app/config /app/config

CMD ["node", "dist/src/app.js"]
