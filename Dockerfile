# syntax=docker/dockerfile:1.13-labs
FROM node:23-slim AS base
RUN corepack enable pnpm

FROM base AS builder
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ARG PORT=3000
ENV PORT=${PORT}
ENV HOST=0.0.0.0

WORKDIR /build

# Install pnpm and turbo
RUN <<EOF
  set -eux
  pnpm config set global-bin-dir /usr/local/bin
  pnpm add --global turbo
EOF

# Copy all the package.json files and pnpm-lock.yaml
COPY \
    --exclude=**/node_modules \
    --exclude=**/.svelte-kit \
    --exclude=**/.turbo \
    --exclude=**/.cache \
    --exclude=**/dist \
    --parents \
    --link \
  **/package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install the dependencies for all packages
RUN --mount=type=cache,target=/root/.cache/pnpm \
    pnpm install \
      --frozen-lockfile \
      --recursive

# Copy the actual sources
COPY \
    --exclude=**/node_modules \
    --exclude=**/.svelte-kit \
    --exclude=**/.turbo \
    --exclude=**/.cache \
    --exclude=**/dist \
    --link \
  . ./

# Build the packages
RUN turbo prune @colibri-hq/app --docker

FROM base AS installer
WORKDIR /build

COPY --from=builder --link /build/out/json/ .
COPY --from=builder --link \
    /build/out/pnpm-lock.yaml \
    /build/out/pnpm-workspace.yaml \
  ./

RUN --mount=type=cache,target=/root/.cache/pnpm \
    pnpm install --frozen-lockfile --prod=false

COPY --from=builder --link /build/out/full/ .

RUN --mount=type=bind,src=turbo.json,dst=turbo.json \
    pnpm turbo run build --filter @colibri-hq/app...

FROM base
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ARG PORT=3000

WORKDIR /app
COPY --chown=node:node --from=installer --link /build/node_modules ./node_modules

WORKDIR /app/apps/app
COPY --chown=node:node --from=installer --link /build/apps/app/node_modules ./node_modules
COPY --chown=node:node --from=installer --link /build/apps/app/dist ./dist

USER node:node
CMD ["node", "dist/index.js"]

EXPOSE ${PORT}
HEALTHCHECK \
    --interval=10s \
    --timeout=5s \
    --start-period=3s \
    --retries=3 \
  CMD \
    wget \
      -q \
      -O=/dev/null \
      -U="Healthcheck (wget)" \
    http://0.0.0.0:${PORT}/api/health \
  || exit 1
