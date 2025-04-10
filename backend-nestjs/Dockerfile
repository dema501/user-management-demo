# ---- Base ----
FROM oven/bun:1.1.20-alpine AS base
WORKDIR /usr/src/app

# ---- Dependencies ----
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- Development ----
FROM base AS dev
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
# Optionally set permissions (Bun image uses bun user)
USER bun

# ---- Production ----
FROM base AS prod
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

USER bun

ENV NODE_ENV=production
ENV PORT=8080
ENV API_PREFIX=/api/v1

EXPOSE ${PORT}

# Bun can run TypeScript directly
CMD ["bun", "run", "src/main.ts"]
