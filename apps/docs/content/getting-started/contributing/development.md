---
title: Development Setup
description: Set up a development environment for Colibri
date: 2024-01-01
order: 1
tags: [development, setup, developers, contributing]
relevance: 55
---

# Development Setup

This comprehensive guide walks you through setting up a local development environment for Colibri, from initial setup to running tests and working with the database.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** - We recommend using [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to manage Node versions
- **pnpm 8+** - Fast, disk-efficient package manager (enable via `corepack enable pnpm`)
- **Docker and Docker Compose** - Required for local Supabase/PostgreSQL
- **Git** - Version control
- **A modern code editor** - We recommend VS Code with Svelte extensions

### Recommended VS Code Extensions

- Svelte for VS Code (`svelte.svelte-vscode`)
- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)
- Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`)

## Fork and Clone

First, fork the repository on GitHub, then clone your fork:

```bash
# Clone your fork (replace YOUR_USERNAME with your GitHub username)
git clone https://github.com/YOUR_USERNAME/colibri.git
cd colibri

# Add upstream remote to sync with the main repo
git remote add upstream https://github.com/colibri-hq/colibri.git
```

## Install Dependencies

Colibri uses pnpm for dependency management and workspaces:

```bash
# Enable pnpm via corepack (comes with Node.js 16.13+)
corepack enable pnpm

# Install all dependencies for all packages
pnpm install
```

This will install dependencies for all apps and packages in the monorepo. The first install may take a few minutes.

## Start Local Services

Colibri requires a PostgreSQL database and S3-compatible storage. We use Supabase CLI to run both locally via Docker:

```bash
# Start Supabase (PostgreSQL + MinIO + Auth + more)
pnpx supabase start
```

This command will:

- Pull and start Docker containers for PostgreSQL, MinIO (S3), and supporting services
- Apply all database migrations from `supabase/migrations/`
- Seed the database with initial data (if present)
- Display connection details and URLs

**Important**: Keep this terminal window open, or run the services in the background. You can stop services with `pnpx supabase stop`.

## Configure Environment

Create your local environment configuration:

```bash
# Copy the example environment file
cp .env.example .env

# Automatically append Supabase connection details
pnpx supabase status --output env >> .env
```

Now open `.env` in your editor and review the settings. Key variables include:

- **Database**: `DB_URL`, `SERVICE_ROLE_KEY`, `ANON_KEY`
- **Storage**: `STORAGE_S3_URL`, `S3_BUCKET_COVERS`, `S3_BUCKET_ASSETS`
- **App**: `APP_SECRET_KEY` (generate a random string for local dev)
- **OAuth**: `OAUTH_ISSUER` (typically `http://localhost:5173`)

For local development, the Supabase-generated values are usually sufficient.

## Start Development Servers

You have several options for running development servers:

```bash
# Option 1: Run all packages in watch mode (recommended for full-stack work)
pnpm dev

# Option 2: Run only the web application
pnpm dev:app

# Option 3: Run only the CLI in watch mode
pnpm dev:cli
```

The web application will be available at **http://localhost:5173**.

### What's Running?

- **Web app** (`apps/app`): SvelteKit dev server on port 5173
- **UI Storybook** (if started separately): Component library on port 6006
- **Package watchers**: TypeScript compilation in watch mode for SDK and other packages

## Development Workflow

### Making Changes

1. **Create a feature branch** from `main` or `v3`:

   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make your changes** in the relevant package or app

3. **Run checks locally** before committing:

   ```bash
   pnpm check    # TypeScript type checking
   pnpm lint     # ESLint
   pnpm fmt      # Prettier formatting
   pnpm test     # Run tests
   ```

4. **Commit your changes**:

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

   Pre-commit hooks (via lefthook) will automatically:
   - Format staged files with Prettier
   - Lint staged files with ESLint
   - Type-check changed TypeScript files
   - Run relevant tests

### Pre-commit Hooks

Colibri uses [lefthook](https://github.com/evilmartians/lefthook) for Git hooks. These run automatically on commit and push:

**Pre-commit** (runs on staged files only):

- `pnpm fmt` - Auto-format code
- `pnpm lint` - Fix linting issues
- `pnpm check` - Type checking
- `pnpm test` - Run related tests

**Pre-push**:

- `pnpm test` - Run all tests

If hooks fail, the commit/push is blocked. Fix the issues and try again.

## Available Commands

### Root-Level Commands

These run across all packages in the monorepo:

```bash
pnpm dev              # Start all packages in dev mode
pnpm dev:app          # Start web app only (+ dependencies)
pnpm dev:cli          # Start CLI only (+ dependencies)

pnpm build            # Build all packages for production
pnpm build:app        # Build web app only
pnpm build:cli        # Build CLI only

pnpm test             # Run all tests
pnpm test:coverage    # Run tests with coverage reports
pnpm test:e2e         # Run Playwright end-to-end tests

pnpm lint             # Lint all packages
pnpm fmt              # Format all packages
pnpm check            # TypeScript type check all packages

pnpm storybook        # Start UI component Storybook
```

### Package-Specific Commands

Navigate to a package and run its scripts:

```bash
# SDK package
cd packages/sdk
pnpm test              # Run Vitest tests
pnpm test:coverage     # Generate coverage report
pnpm test:ui           # Run tests with Vitest UI
pnpm types             # Regenerate database types from schema

# Web app
cd apps/app
pnpm dev               # Start dev server
pnpm test              # Run Playwright tests
pnpm test:vitest       # Run Vitest tests
pnpm check             # Svelte type checking

# CLI
cd apps/cli
pnpm dev               # Build CLI in watch mode
pnpm test              # Run CLI tests
```

## Working with the Database

### Understanding the Schema

Database schema is defined in SQL migration files in `supabase/migrations/` and type-safe TypeScript types are generated from the live database.

### Generating Types

After changing the database schema (or when first setting up):

```bash
cd packages/sdk
pnpm types
```

This runs `kysely-codegen` to generate TypeScript types in `packages/sdk/src/schema.d.ts` from your running Supabase database.

**Important**: Always regenerate types after applying migrations.

### Creating Migrations

To create a new database migration:

```bash
# Create a new migration file
pnpx supabase migration new add_some_feature

# Edit the generated file in supabase/migrations/
# Write your SQL (CREATE TABLE, ALTER TABLE, etc.)

# Apply the migration
pnpx supabase db reset

# Generate updated TypeScript types
cd packages/sdk && pnpm types
```

### Resetting the Database

To reset your local database to a clean state:

```bash
# This will drop all tables, reapply migrations, and run seeds
pnpx supabase db reset
```

### Accessing the Database

You can access the local PostgreSQL database in several ways:

**Supabase Studio** (web UI):

```bash
pnpx supabase status
# Look for "Studio URL" - typically http://localhost:54323
```

**psql** (command line):

```bash
pnpx supabase db psql
```

**Connection string** (for external tools like TablePlus, DBeaver):

```
postgresql://postgres:postgres@localhost:54322/postgres
```

## Running Tests

Colibri uses different test frameworks for different packages:

### All Tests

```bash
# Run all tests across all packages
pnpm test

# Run with coverage
pnpm test:coverage
```

### SDK Tests (Vitest)

```bash
cd packages/sdk
pnpm test              # Run once
pnpm test:ui           # Interactive UI
pnpm test:coverage     # With coverage
```

### App Tests (Playwright)

```bash
cd apps/app
pnpm test              # E2E tests
pnpm test:vitest       # Unit tests
```

Playwright tests require the database to be running. They automatically set up and tear down test data.

### CLI Tests (Vitest)

```bash
cd apps/cli
pnpm test
```

### Writing Tests

- **Unit tests**: Use Vitest for pure logic (utilities, parsers, etc.)
- **Integration tests**: Use Vitest with database fixtures for SDK resources
- **E2E tests**: Use Playwright for full user flows in the web app
- Place test files next to the code: `my-module.ts` → `my-module.test.ts`

## Code Quality

### Linting

Colibri uses ESLint with a shared configuration from `@colibri-hq/shared`:

```bash
# Check for issues
pnpm lint

# Auto-fix issues (happens automatically on commit)
pnpm lint --fix
```

ESLint rules enforce:

- TypeScript best practices
- Svelte component conventions
- Import ordering
- Accessibility rules

### Formatting

Prettier handles code formatting:

```bash
# Format all files
pnpm fmt

# Check formatting
pnpm fmt --check
```

**Tip**: Configure your editor to format on save for the best experience.

### Type Checking

TypeScript is configured in strict mode:

```bash
# Check all packages
pnpm check

# Check specific package
cd apps/app
pnpm check
```

## UI Development with Storybook

The `packages/ui` component library uses Storybook for isolated component development:

```bash
# Start Storybook
pnpm storybook
```

This opens Storybook at **http://localhost:6006** where you can:

- Browse all UI components
- View component documentation
- Test different props and states
- Develop components in isolation

When creating new components, add a `.stories.svelte` file alongside your component.

## Debugging Tips

### Debug Mode

Enable debug logging for various subsystems:

```bash
# In .env
DEBUG=colibri:*              # All debug logs
DEBUG=colibri:db             # Database queries
DEBUG=colibri:metadata       # Metadata providers
DEBUG=colibri:storage        # Storage operations
```

### SvelteKit Debugging

- Use browser DevTools for client-side issues
- Check the terminal output for server-side logs
- Use `console.log` liberally during development
- Install Svelte DevTools browser extension

### Database Debugging

Enable query logging in the SDK:

```typescript
import { initialize } from "@colibri-hq/sdk";

const db = initialize(process.env.DB_URL, {
  debug: true, // Logs all SQL queries
});
```

### CLI Debugging

```bash
# Run CLI with debug output
DEBUG=* colibri works list

# Use Node inspector
node --inspect-brk ./dist/index.js works list
```

## Troubleshooting

### Port Already in Use

If port 5173 (or other ports) are already taken:

```bash
# Find and kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or specify a different port
PORT=3000 pnpm dev:app
```

### Docker Issues

```bash
# Restart Supabase services
pnpx supabase stop
pnpx supabase start

# Clean up Docker resources
docker system prune
```

### Dependency Issues

```bash
# Clean install
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install

# Clear pnpm cache
pnpm store prune
```

### Type Generation Fails

```bash
# Ensure database is running
pnpx supabase status

# Check connection
pnpx supabase db psql

# Regenerate types
cd packages/sdk
pnpm types
```

## Next Steps

Now that your development environment is set up, you can:

- Read the [Architecture Guide](/getting-started/contributing/architecture) to understand the codebase structure
- Review [Contributing Guidelines](/getting-started/contributing/guidelines) for code standards and PR process
- Explore the [API Documentation](/user-guide/api) to learn about available endpoints
- Check out [Good First Issues](https://github.com/colibri-hq/colibri/labels/good%20first%20issue) on GitHub

## Getting Help

If you run into issues:

- Check the [Troubleshooting Guide](/setup/troubleshooting)
- Search [GitHub Issues](https://github.com/colibri-hq/colibri/issues)
- Ask in [GitHub Discussions](https://github.com/colibri-hq/colibri/discussions)
- Review the [Architecture documentation](/getting-started/contributing/architecture)

Welcome to the Colibri community! We're excited to have you contributing.
