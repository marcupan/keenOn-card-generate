# services/keenOn-card-generate/Dockerfile

# Base Stage
FROM node:20-alpine AS base
WORKDIR /app

# Install build tools and PostgreSQL client (for pg_isready)
RUN apk add --no-cache build-base python3 postgresql-client

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@9.9.0 --activate
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm rebuild bcrypt

# Copy application source and build
COPY . .
RUN pnpm run build

# Development Stage
FROM base AS development
EXPOSE 4000
CMD ["pnpm", "run", "start:dev"]

# Production Stage
FROM node:20-alpine AS production
# Install PostgreSQL client so that wait-for-db.sh can use pg_isready
RUN apk add --no-cache postgresql-client
RUN corepack enable && corepack prepare pnpm@9.9.0 --activate
RUN addgroup -g 1001 app && adduser -D -u 1001 -G app app

WORKDIR /app

# Copy built artifacts and dependencies from base stage
COPY --from=base /app/dist /app/dist
COPY --from=base /app/node_modules /app/node_modules
COPY --from=base /app/config /app/config
COPY --from=base /app/package.json /app/package.json
COPY --from=base /app/pnpm-lock.yaml /app/pnpm-lock.yaml

# Copy the wait-for-db.sh script and make it executable.
COPY wait-for-db.sh /app/wait-for-db.sh
RUN chmod +x /app/wait-for-db.sh

# Change ownership of /app so that the non-root user "app" can write.
RUN chown -R app:app /app

# Switch to non-root user for runtime.
USER app

RUN pnpm install --prod --frozen-lockfile

CMD ["sh", "-c", "./wait-for-db.sh && pnpm db:migrate:prod && node dist/src/app.js"]
