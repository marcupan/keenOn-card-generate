FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache build-base python3 postgresql-client

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@9.9.0 --activate
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm rebuild bcrypt

COPY . .
RUN pnpm run build

FROM base AS development
EXPOSE 4000
CMD ["pnpm", "run", "start:dev"]

FROM node:20-alpine AS production

RUN apk add --no-cache postgresql-client

RUN npm install -g pnpm@9.9.0

RUN addgroup -g 1001 app && adduser -D -u 1001 -G app app

WORKDIR /app

COPY --from=base /app/dist /app/dist
COPY --from=base /app/node_modules /app/node_modules
COPY --from=base /app/config /app/config
COPY --from=base /app/package.json /app/package.json
COPY --from=base /app/pnpm-lock.yaml /app/pnpm-lock.yaml

COPY wait-for-db.sh /app/wait-for-db.sh
RUN chmod +x /app/wait-for-db.sh

RUN chown -R app:app /app

USER app

RUN pnpm install --prod --frozen-lockfile

CMD ["sh", "-c", "./wait-for-db.sh && pnpm db:migrate:prod && node dist/src/app.js"]
