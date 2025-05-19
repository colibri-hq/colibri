# syntax=docker/dockerfile:1.13-labs
ARG PACKAGE_NAMESPACE=colibri-hq

# Base Layer: This layer is used as the base for all following images, and can
# be used to set up the environment for the application.
FROM node:23-slim AS base
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# The installer image will be used for the intermediate stages used to build the
# application images; it comes with the package manager pre-installed.
FROM base AS installer
ENV TURBO_TELEMETRY_DISABLED=1
WORKDIR /build
RUN corepack enable pnpm && corepack prepare pnpm@latest --activate

# The base image for the build stage. This image will be used to build the apps
# from sources using turbo.
FROM installer AS builder

# Install turbo globally
RUN <<EOF
  set -eux
  pnpm config set global-bin-dir /usr/local/bin
  pnpm add --global turbo
EOF

# Copy the actual sources, excluding any generated files to ensure we have a
# clean build.
COPY \
    --exclude=**/node_modules \
    --exclude=**/.svelte-kit \
    --exclude=**/.turbo \
    --exclude=**/.cache \
    --exclude=**/dist \
    --link \
  . ./

FROM builder AS cli_builder
ARG PACKAGE_NAMESPACE

# Generate a partial monorepo for the CLI package.
# See: https://turborepo.com/docs/reference/prune
RUN turbo prune "@${PACKAGE_NAMESPACE}/cli" \
      --out-dir out \
      --docker

FROM installer AS cli_installer
ARG PACKAGE_NAMESPACE

# Copy the package manager files first, so we can take advantage of Docker's
# caching mechanism. This way, if we don't change the package manager files,
# Docker will use the cached layer and won't re-run the install step.
COPY --from=cli_builder --link /build/out/json/ .

# Install the dependencies for the CLI. By including the `--prod=false` flag, we
# will include development dependencies, since we're going to build the CLI in
# the next step.
RUN --mount=type=cache,target=/root/.cache/pnpm \
    --mount=type=bind,from=cli_builder,src=/build/out/pnpm-lock.yaml,dst=pnpm-lock.yaml \
    --mount=type=bind,src=pnpm-workspace.yaml,dst=pnpm-workspace.yaml \
    pnpm install --frozen-lockfile --prod=false

# Copy the actual sources
COPY --from=cli_builder --link /build/out/full/ .

# See: https://pnpm.io/next/cli/deploy
#      https://github.com/pnpm/pnpm/issues/9386 (for a discussion on `--legacy`)
RUN --mount=type=cache,target=/root/.cache/pnpm \
    --mount=type=bind,src=pnpm-workspace.yaml,dst=pnpm-workspace.yaml \
    <<EOF
    set -eux
    pnpm run build:cli
    pnpm deploy /out \
      --filter "@${PACKAGE_NAMESPACE}/cli" \
      --legacy \
      --prod
    mv ./apps/cli/dist /out/dist
EOF

FROM base AS cli
WORKDIR /app
COPY --chown=node:node --from=cli_installer --link /out/bin/run.js ./bin/run.js
COPY --chown=node:node --from=cli_installer --link /out/node_modules ./node_modules
COPY --chown=node:node --from=cli_installer --link /out/package.json /out/oclif.manifest.json ./
COPY --chown=node:node --from=cli_installer --link /out/dist ./dist

USER node:node
SHELL ["/bin/bash", "-c"]
ENTRYPOINT ["node", "bin/run.js"]
CMD ["--help"]

FROM builder AS server_builder
ARG PACKAGE_NAMESPACE
RUN turbo prune "@${PACKAGE_NAMESPACE}/app" \
    --out-dir out \
    --docker

FROM installer AS server_installer
ARG PACKAGE_NAMESPACE
ARG PORT=3000
ENV PORT=${PORT}
ENV HOST=0.0.0.0

COPY --from=server_builder --link /build/out/json/ .

RUN --mount=type=cache,target=/root/.cache/pnpm \
    --mount=type=bind,from=server_builder,src=/build/out/pnpm-lock.yaml,dst=pnpm-lock.yaml \
    --mount=type=bind,src=pnpm-workspace.yaml,dst=pnpm-workspace.yaml \
    pnpm install --frozen-lockfile --prod=false

COPY --from=server_builder --link /build/out/full/ .

RUN --mount=type=cache,target=/root/.cache/pnpm \
    --mount=type=bind,src=turbo.json,dst=turbo.json \
    --mount=type=bind,src=pnpm-workspace.yaml,dst=pnpm-workspace.yaml \
    <<EOF
    set -eux
    pnpm run build:app
    pnpm deploy /out \
      --filter "@${PACKAGE_NAMESPACE}/app" \
      --legacy \
      --prod
    mv ./apps/app/dist /out/dist
EOF

FROM base AS server
ARG PORT=3000
ENV PORT=$PORT
ENV HOST=0.0.0.0

WORKDIR /app
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
    "http://0.0.0.0:${PORT}/api/health" \
  || exit 1

COPY --chown=node:node --from=server_installer --link /out/node_modules ./node_modules
COPY --chown=node:node --from=server_installer --link /out/package.json ./
COPY --chown=node:node --from=server_installer --link /out/dist ./dist
