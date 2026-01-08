# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Colibri is a self-hosted ebook library application with a web interface, built on SvelteKit. It supports ebook
management, collections, metadata retrieval from public knowledge graphs, and passwordless authentication via Passkeys.

## Development Commands

```bash
# Install dependencies (requires pnpm)
corepack enable pnpm
pnpm install

# Start local Supabase/Postgres database
pnpx supabase start

# Setup environment
cp .env.example .env
pnpx supabase status --output env >> .env

# Development
pnpm dev              # Run all packages in dev mode
pnpm dev:app          # Run only the web app
pnpm dev:cli          # Run only the CLI

# Build
pnpm build            # Build all packages
pnpm build:app        # Build only the web app
pnpm build:cli        # Build only the CLI

# Testing
pnpm test             # Run all tests
# Single package tests:
cd packages/sdk && pnpm test           # Vitest
cd apps/app && pnpm test               # Playwright
cd apps/cli && pnpm test               # Vitest

# Linting and Formatting
pnpm lint             # Lint all packages
pnpm fmt              # Format all packages

# Generate database types from schema
cd packages/sdk && pnpm types

# Storybook (UI components)
pnpm storybook
```

## Architecture

### Monorepo Structure (Turborepo + pnpm workspaces)

**Apps:**

- `apps/app` - Main SvelteKit web application with tRPC API
- `apps/cli` - oclif-based CLI tool (`colibri` command)
- `apps/docs` - Documentation site

**Packages:**

- `packages/sdk` - Core SDK: database (Kysely/Postgres), S3 storage, ebook parsing, metadata providers
- `packages/ui` - Svelte component library with Storybook, uses bits-ui
- `packages/shared` - Shared utilities, blurhash, XML parsing; exports shared eslint/prettier/vitest configs
- `packages/mobi` - MOBI ebook format parser
- `packages/pdf` - pdf.js wrapper with conditional exports for node/browser/worker
- `packages/oauth` - OAuth 2.0 authorization server implementation
- `packages/open-library-client` - Open Library API client for metadata

### Key Technical Patterns

**Database:** Kysely ORM with PostgreSQL (via Supabase). Schema types generated from database. Migrations in
`supabase/migrations/`.

**API:** tRPC for type-safe client-server communication. Router in `apps/app/src/lib/trpc/`, routes split by domain.

**Ebook Processing:** SDK handles EPUB, MOBI, and PDF formats. Metadata extraction and cover image processing.

**Storage:** S3-compatible storage via AWS SDK. Abstracted in `packages/sdk/src/storage/`.

**Authentication:** Passkeys (WebAuthn) via SimpleWebAuthn library.

### Package Dependencies Flow

```
apps/app, apps/cli
    └── packages/sdk
            ├── packages/mobi
            ├── packages/pdf
            ├── packages/oauth
            ├── packages/open-library-client
            └── packages/shared
    └── packages/ui
            └── packages/sdk
```

## Code Style

- TypeScript with strict mode, ESNext target, NodeNext module resolution
- Svelte 5 for components
- Tailwind CSS 4 for styling
- ESLint + Prettier with shared configs from `@colibri-hq/shared`

### Git Hooks (lefthook)

Git hooks are managed by [lefthook](https://github.com/evilmartians/lefthook) and configured in `lefthook.yaml`:

**Pre-commit** (runs on every commit):

- Formats staged files with Prettier
- Uses `stage_fixed: true` to re-stage formatted files
- Skips during merge/rebase operations

**Pre-push** (runs before pushing):

- `pnpm check` - TypeScript type checking
- `pnpm lint` - ESLint
- `pnpm test` - Test suite

**Key files:**

- `lefthook.yaml` - Hook configuration
- `prettier.config.js` - Root config importing from `@colibri-hq/shared/prettier.config`
- `packages/shared/prettier.config.ts` - Shared Prettier config with plugins
- `packages/shared/eslint.config.ts` - Shared ESLint config

**Troubleshooting:**

- If hooks fail with "Cannot find package", ensure `@colibri-hq/shared` is in root `devDependencies`
- Run `lefthook install` after modifying `lefthook.yaml`
- The root `prettier.config.js` must import from `@colibri-hq/shared/prettier.config` (not relative path)

## CLI Commands

The CLI uses oclif with topic-based command structure:

- `colibri works` - Manage works and editions
- `colibri creators` - Manage creators
- `colibri publishers` - Manage publishers
- `colibri storage` - Manage persistent storage
- `colibri settings` - Instance settings
- `colibri users` - User account management
- `colibri oauth` - OAuth integrations

## Specialized Agents

This project has specialized agents in `.claude/agents/` that have deep knowledge of specific areas. **Use these agents
proactively** for better assistance:

| Agent                       | Use For                                                 |
| --------------------------- | ------------------------------------------------------- |
| **sdk-expert**              | Database operations, ebook parsing, storage, Kysely ORM |
| **cli-expert**              | CLI commands, oclif patterns, terminal output           |
| **web-app-expert**          | SvelteKit routes, tRPC API, authentication flows        |
| **ui-components-expert**    | Svelte components, Storybook, bits-ui, accessibility    |
| **database-expert**         | PostgreSQL schema, migrations, Kysely queries           |
| **ebook-processing-expert** | EPUB/MOBI/PDF parsing, metadata extraction              |
| **metadata-expert**         | OpenLibrary, WikiData, ISNI, VIAF integrations          |
| **infrastructure-expert**   | OAuth, shared utilities, cryptography, configs          |
| **svelte-expert**           | Svelte 5 patterns, reactivity, component design         |
| **tech-lead**               | Architecture decisions, feature planning                |

### When to Use Agents

- **Always use the appropriate agent** when working in its domain
- Agents have comprehensive memory of the codebase structure, patterns, and conventions
- For cross-cutting concerns, the tech-lead agent can coordinate between specialists
- When in doubt, start with an exploration and use the agent that matches the area
