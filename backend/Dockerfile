# syntax=docker/dockerfile:1

# ---- Build stage -------------------------------------------------------------
FROM node:22-bookworm-slim AS builder

# bcrypt is a native module; these are needed when no prebuilt binary matches.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

RUN npm run build

# Drop dev dependencies from the tree we copy forward.
RUN npm prune --omit=dev

# ---- Runtime stage -----------------------------------------------------------
FROM node:22-bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

USER node

EXPOSE 4001

# The application exits non-zero on a bad configuration or an unreachable
# database, so an orchestrator restarts it instead of serving an empty app.
CMD ["node", "dist/main.js"]