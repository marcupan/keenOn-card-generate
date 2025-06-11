FROM node:20-alpine AS base
WORKDIR /app

# Install necessary build tools and dependencies
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

FROM base AS development
WORKDIR /app

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

FROM base AS production
WORKDIR /app
RUN addgroup -g 1001 app && adduser -D -u 1001 -G app app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY . .
RUN pnpm run build

# Rebuild bcrypt for production
RUN cd node_modules/bcrypt && node-pre-gyp install --fallback-to-build

# Set permissions
RUN chown -R app:app /app
USER app

COPY wait-for-db.sh ./wait-for-db.sh
RUN chmod +x ./wait-for-db.sh

CMD ["sh", "-c", "./wait-for-db.sh && pnpm db:push && node dist/src/app.js"]
