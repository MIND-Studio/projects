# syntax=docker/dockerfile:1.7
#
# Production image for this Mind app. Two stages:
#   builder — installs deps and runs `next build` to emit .next/standalone.
#   runtime — minimal Debian-slim running the standalone server as non-root.
# Mirrors the drive image (no native modules).

# --- Stage 1: build --------------------------------------------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# `.npmrc` points the @mind-studio scope at GitHub Packages, reading the token
# from $NODE_AUTH_TOKEN passed as a BuildKit secret (never layer-baked).
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=secret,id=node_auth_token \
    NODE_AUTH_TOKEN="$(cat /run/secrets/node_auth_token 2>/dev/null || true)" \
    npm ci --no-audit --no-fund

# Guarantee Next's native swc binary (npm/cli #4828; Turbopack has no WASM
# fallback). Public package, no GHCR auth; --no-save leaves the lockfile intact.
RUN npm install --no-save "@next/swc-linux-$(node -p process.arch)-gnu@$(node -p "require('next/package.json').version")"

COPY . .
RUN mkdir -p public

# NEXT_PUBLIC_* are inlined at build time (passed as build-args by the workflow).
# Issuer/pod base set the OIDC issuer; the rest select the deployment profile
# (see README). All optional — omitting them yields the personal-app default.
ARG NEXT_PUBLIC_SOLID_ISSUER
ARG NEXT_PUBLIC_POD_BASE_URL
ARG NEXT_PUBLIC_APP_TITLE
ARG NEXT_PUBLIC_WORKSPACE_MODE
ARG NEXT_PUBLIC_WORKSPACE
ARG NEXT_PUBLIC_PROJECT_MODE
ARG NEXT_PUBLIC_PROJECT
ARG NEXT_PUBLIC_BASE_DOMAIN
ARG NEXT_PUBLIC_PROJECT_ALIASES
ARG NEXT_PUBLIC_BRANDING
ARG NEXT_PUBLIC_HUB_BRANDING
ARG NEXT_PUBLIC_ASSISTANT
ARG NEXT_PUBLIC_ASSISTANT_NAME
ARG NEXT_PUBLIC_LOCALE
ARG NEXT_PUBLIC_LOGIN_FIELDS
ARG NEXT_PUBLIC_FRAME_ANCESTORS
ARG NEXT_PUBLIC_WRITE_BACKEND
ENV NEXT_PUBLIC_SOLID_ISSUER=$NEXT_PUBLIC_SOLID_ISSUER \
    NEXT_PUBLIC_POD_BASE_URL=$NEXT_PUBLIC_POD_BASE_URL \
    NEXT_PUBLIC_APP_TITLE=$NEXT_PUBLIC_APP_TITLE \
    NEXT_PUBLIC_WORKSPACE_MODE=$NEXT_PUBLIC_WORKSPACE_MODE \
    NEXT_PUBLIC_WORKSPACE=$NEXT_PUBLIC_WORKSPACE \
    NEXT_PUBLIC_PROJECT_MODE=$NEXT_PUBLIC_PROJECT_MODE \
    NEXT_PUBLIC_PROJECT=$NEXT_PUBLIC_PROJECT \
    NEXT_PUBLIC_BASE_DOMAIN=$NEXT_PUBLIC_BASE_DOMAIN \
    NEXT_PUBLIC_PROJECT_ALIASES=$NEXT_PUBLIC_PROJECT_ALIASES \
    NEXT_PUBLIC_BRANDING=$NEXT_PUBLIC_BRANDING \
    NEXT_PUBLIC_HUB_BRANDING=$NEXT_PUBLIC_HUB_BRANDING \
    NEXT_PUBLIC_ASSISTANT=$NEXT_PUBLIC_ASSISTANT \
    NEXT_PUBLIC_ASSISTANT_NAME=$NEXT_PUBLIC_ASSISTANT_NAME \
    NEXT_PUBLIC_LOCALE=$NEXT_PUBLIC_LOCALE \
    NEXT_PUBLIC_LOGIN_FIELDS=$NEXT_PUBLIC_LOGIN_FIELDS \
    NEXT_PUBLIC_FRAME_ANCESTORS=$NEXT_PUBLIC_FRAME_ANCESTORS \
    NEXT_PUBLIC_WRITE_BACKEND=$NEXT_PUBLIC_WRITE_BACKEND

RUN npm run build

# --- Stage 2: runtime ------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*

USER node

COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static
COPY --chown=node:node --from=builder /app/public ./public

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
