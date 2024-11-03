# Dockerfile

# Base image
FROM node:20-slim AS base

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@9.9.0

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the application
RUN pnpm run build

# Production image
FROM node:20-slim AS production

# Set working directory
WORKDIR /app

# Copy dependencies and built files from the build stage
COPY --from=base /app/node_modules /app/node_modules
COPY --from=base /app/dist /app/dist

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/src/app.js"]

# Development image
FROM node:20-slim AS development

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@9.9.0

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy the rest of the application code
COPY . .

# Expose port
EXPOSE 8080

# Start the application in development mode
CMD ["pnpm", "start:dev"]
