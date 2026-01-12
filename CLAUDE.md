# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Colibri is a self-hosted ebook library application with a web interface, built on SvelteKit. It supports ebook
management, collections, metadata retrieval from public knowledge graphs, and passwordless authentication via Passkeys.

**Key Technologies:**

- **Framework:** SvelteKit with Svelte 5
- **Database:** PostgreSQL via Kysely ORM (managed with Supabase)
- **API:** tRPC for type-safe client-server communication
- **Storage:** S3-compatible object storage
- **Authentication:** WebAuthn Passkeys, OAuth 2.0/2.1, API Keys
- **Styling:** Tailwind CSS 4
- **Monorepo:** Turborepo + pnpm workspaces
- **License:** AGPL-3.0-or-later

## Development Commands

```bash
# Install dependencies (requires pnpm 10.27+)
corepack enable pnpm
pnpm install

# Start local Supabase/Postgres database
pnpx supabase start

# Setup environment
cp .env.example .env
pnpx supabase status --output env >> .env

# Development
pnpm dev              # Run all packages in dev mode
pnpm dev:app          # Run only the web app (http://localhost:5173)
pnpm dev:cli          # Run only the CLI
pnpm dev:docs         # Run only the docs site (http://localhost:5174)

# Build
pnpm build            # Build all packages
pnpm build:app        # Build only the web app
pnpm build:cli        # Build only the CLI
pnpm build:docs       # Build only the docs site

# Testing
pnpm test             # Run all tests (Vitest + Playwright)
pnpm test:coverage    # Run tests with coverage reports
pnpm test:e2e         # Run E2E tests only
# Single package tests:
cd packages/sdk && pnpm test           # Vitest
cd apps/app && pnpm test               # Playwright
cd apps/cli && pnpm test               # Vitest

# Linting and Formatting
pnpm lint             # Lint all packages
pnpm fmt              # Format all packages
pnpm check            # TypeScript type checking

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
- `apps/docs` - Documentation site (Cloudflare Pages)

**Packages:**

- `packages/sdk` - Core SDK: database (Kysely/Postgres), S3 storage, ebook parsing, metadata providers, authentication
- `packages/ui` - Svelte 5 component library with Storybook (37 components), uses bits-ui
- `packages/shared` - Shared utilities, blurhash, XML parsing; exports shared eslint/prettier/vitest configs
- `packages/mobi` - MOBI ebook format parser (binary-parser based)
- `packages/pdf` - pdf.js wrapper with conditional exports for node/browser/worker
- `packages/oauth` - OAuth 2.0/2.1 authorization server and client implementation
- `packages/open-library-client` - Open Library API client for metadata
- `packages/languages` - ISO 639-3 language code resolution
- `packages/setup` - Interactive setup wizard for new instances

### Package Dependencies Flow

```
apps/app, apps/cli
    └── packages/sdk
            ├── packages/mobi
            ├── packages/pdf
            ├── packages/oauth
            ├── packages/open-library-client
            ├── packages/languages
            └── packages/shared
    └── packages/ui
            └── packages/sdk (types only)
```

### SDK Package Structure (`packages/sdk`)

The SDK is the core library with multiple entry points:

| Export Path   | Purpose                                      |
| ------------- | -------------------------------------------- |
| `.`           | Resources, database, scopes, settings        |
| `./server`    | Server-only: asset, image (Node.js APIs)     |
| `./client`    | Client-safe: icon-urn, scopes (no Node deps) |
| `./schema`    | Database schema types (generated)            |
| `./oauth`     | OAuth server/client functionality            |
| `./storage`   | S3 storage abstraction layer                 |
| `./ebooks`    | EPUB/MOBI/PDF parsing & metadata             |
| `./metadata`  | Metadata providers system                    |
| `./ingestion` | Full ebook ingestion pipeline                |
| `./settings`  | Settings registry & management               |
| `./scopes`    | Permission scopes (API keys, OAuth)          |
| `./types`     | Type-only exports (safe for client)          |

**Key SDK Modules:**

- `src/resources/` - High-level CRUD operations for all domain entities
- `src/ebooks/` - Format parsers (EPUB v2/v3, MOBI, PDF)
- `src/ingestion/` - Complete import pipeline with duplicate detection
- `src/metadata/` - Multi-provider enrichment (OpenLibrary, WikiData, VIAF, ISBNdb, etc.)
- `src/storage/` - S3 client abstraction with presigned URLs
- `src/scopes/` - OAuth/API key permission system

### Web App Structure (`apps/app`)

**Route Organization:**

- `(library)/` - Protected authenticated library area
- `auth/` - Authentication flows (Passkeys, OAuth, passcode)
- `api/` - RESTful API endpoints
- `.well-known/` - Discovery endpoints (OpenID, OAuth, Colibri server)

**Key Routes:**

- `/works` - Library browser with search and filtering
- `/collections` - User-created collections
- `/creators`, `/publishers`, `/series` - Metadata browsing
- `/discover/[catalog]` - OPDS catalog browser
- `/instance/settings` - Admin panel
- `/auth/login` - Authentication entry point

**tRPC Router Organization** (`src/lib/trpc/`):

14 domain-based route modules: accounts, apiKeys, books, catalogs, collections, comments, creators, languages,
notifications, publishers, search, series, settings, users

**Component Library** (`src/lib/components/`):

- `Auth/` - Authentication UI (digits input, OAuth prompts)
- `Sidebar/` - Navigation, collections list, user profile
- `Comments/` - Threaded comments with reactions
- `Upload/` - File upload, import queue, enrichment
- `Pagination/` - Paginated lists
- `Links/` - Typed link components (WorkLink, AuthorLink, etc.)
- `Form/` - Form inputs with autocomplete

### CLI Structure (`apps/cli`)

**Topic-based commands:**

| Topic        | Commands                                             |
| ------------ | ---------------------------------------------------- |
| `works`      | list, add, inspect, import                           |
| `creators`   | list, add, inspect, edit                             |
| `publishers` | list, inspect, edit                                  |
| `storage`    | connect, list-buckets, list, make-bucket, copy, move |
| `settings`   | version, get, set                                    |
| `users`      | list, add, update, remove                            |
| `oauth`      | clients (list, add, update, remove)                  |

**Root commands:** `connect`, `login`, `discover`

## Database Schema

### Core Tables

| Table          | Purpose                                            |
| -------------- | -------------------------------------------------- |
| `work`         | Container for a conceptual work                    |
| `edition`      | Specific edition with ISBN, ASIN, cover            |
| `asset`        | Physical ebook files in S3                         |
| `contribution` | Links creators to editions with MARC relator roles |
| `creator`      | Authors, illustrators, translators                 |
| `publisher`    | Publishing companies                               |
| `collection`   | User-created collections with privacy settings     |
| `series`       | Book series groupings                              |
| `tag`          | Subject/topic tags                                 |
| `image`        | Cover images with blurhash                         |
| `comment`      | Threaded comments with moderation                  |

### Authentication Schema (`authentication.*`)

| Table                | Purpose                             |
| -------------------- | ----------------------------------- |
| `user`               | App users with roles (admin/adult)  |
| `authenticator`      | WebAuthn passkey storage            |
| `api_key`            | API keys with scopes (SHA-256 hash) |
| `client`             | OAuth clients with redirect URIs    |
| `access_token`       | OAuth access tokens                 |
| `refresh_token`      | OAuth refresh tokens                |
| `authorization_code` | PKCE-compliant auth codes           |
| `device_challenge`   | OAuth Device Grant flow             |

### Row-Level Security (RLS)

All tables have RLS enabled. The app sets `app.current_user_id` setting before queries:

```sql
USING (user_id::text = current_setting('app.current_user_id', true))
```

### Schema Generation

```bash
cd packages/sdk && pnpm types
# Runs: kysely-codegen --dialect postgres --env-file ../../.env --url 'env(DB_URL)'
# Generates: src/schema.d.ts
```

## Authentication System

### Multi-Method Authentication

1. **WebAuthn/Passkeys** (Primary) - via `@simplewebauthn/server`
2. **Email Passcode** (Fallback) - One-time codes sent to email
3. **OAuth 2.0/2.1** - Full authorization server for third-party apps
4. **API Keys** - Programmatic access with scopes

### JWT Session Management

- Cookie-based sessions with configurable cookie name
- JWT payload: `sub` (userId), `name`, `email`
- Verified in server hooks via `resolveUserId()`

### API Key Format

- Prefix: `col_` + 8 random characters
- Storage: SHA-256 hash (never plain text)
- Scopes: Fine-grained permissions
- Features: Expiration, rotation with grace period, usage tracking

### Scopes System

Hierarchical scope system for OAuth and API keys:

- `books:read`, `books:write`, `books:delete`
- `collections:read`, `collections:write`
- `metadata:read`, `metadata:write`
- `users:read`, `users:write`
- `settings:read`, `settings:write`

## Testing

### Test Frameworks

- **Vitest** - Unit and integration tests
- **Playwright** - E2E and browser tests

### Coverage Requirements

- **SDK**: 60% (statements, branches, functions, lines)
- **Other packages**: 80%

### E2E Test Setup

```bash
# apps/app/tests/
database.setup.ts      # Seeds test data
authentication.setup.ts # Creates JWT cookie
database.teardown.ts   # Cleanup test data
test-data.ts           # Test constants (IDs)
base.ts                # Fixtures with database access
```

### Running Tests

```bash
pnpm test              # All tests
pnpm test:coverage     # With coverage
cd apps/app && pnpm test # E2E only
```

## Code Style

- TypeScript with strict mode, ESNext target, NodeNext module resolution
- Svelte 5 for components (use `$state`, `$derived`, `$effect`)
- Tailwind CSS 4 for styling (use `@apply` sparingly)
- ESLint + Prettier with shared configs from `@colibri-hq/shared`

### Svelte 5 Patterns

```svelte
<script lang="ts">
  // Props with $props()
  let { value = $bindable(), onChange }: Props = $props();

  // State with $state()
  let count = $state(0);

  // Derived values with $derived()
  let doubled = $derived(count * 2);

  // Effects with $effect()
  $effect(() => {
    console.log('count changed:', count);
  });
</script>
```

### Component Library Patterns

The UI package uses bits-ui for headless primitives:

```svelte
<!-- Use snippets for composability -->
{#snippet item(data)}
  <span>{data.label}</span>
{/snippet}

<Autocomplete items={options} {item} />
```

## Git Hooks (lefthook)

**Pre-commit:**

- Formats staged files with Prettier
- Uses `stage_fixed: true` to re-stage formatted files
- Skips during merge/rebase operations

**Pre-push:**

- `pnpm check` - TypeScript type checking
- `pnpm lint` - ESLint
- `pnpm test` - Test suite

**Troubleshooting:**

- Run `lefthook install` after modifying `lefthook.yaml`
- If hooks fail with "Cannot find package", ensure `@colibri-hq/shared` is in root `devDependencies`

## Environment Variables

### Required

| Variable         | Purpose                      |
| ---------------- | ---------------------------- |
| `DB_URL`         | PostgreSQL connection string |
| `JWT_SECRET`     | JWT signing key              |
| `APP_SECRET_KEY` | URL signing secret           |

### Optional

| Variable                 | Purpose                           |
| ------------------------ | --------------------------------- |
| `DATABASE_CERTIFICATE`   | SSL certificate for DB (base64)   |
| `JWT_COOKIE_NAME`        | Auth cookie name (default: `jwt`) |
| `PUBLIC_PASSCODE_LENGTH` | Passcode length                   |
| `COLIBRI_ENCRYPTION_KEY` | Encryption key for secrets        |

## Docker Deployment

```yaml
# docker-compose.yaml services
colibri   # Web app container
postgres  # PostgreSQL 18 database
minio     # S3-compatible object storage
```

**Buckets:**

- `creator-images` - Public, images only
- `covers` - Public, images only
- `assets` - Private storage
- `colibri` - Public storage

## Specialized Agents - MANDATORY USAGE

> **CRITICAL: You MUST use specialized agents whenever working in their domain.** These agents have deep, comprehensive
> knowledge of their areas including file locations, patterns, conventions, and gotchas. Using agents dramatically
> improves code quality and reduces errors. **DO NOT attempt domain-specific work without consulting the appropriate
> agent first.**

This project has specialized agents in `.claude/agents/` with extensive memory of the codebase:

| Agent                       | Use For                                                      | Priority |
| --------------------------- | ------------------------------------------------------------ | -------- |
| **sdk-expert**              | Database operations, ebook parsing, storage, Kysely ORM      | HIGH     |
| **cli-expert**              | CLI commands, oclif patterns, terminal output                | HIGH     |
| **web-app-expert**          | SvelteKit routes, tRPC API, authentication flows             | HIGH     |
| **ui-components-expert**    | Svelte components, Storybook, bits-ui, accessibility         | HIGH     |
| **database-expert**         | PostgreSQL schema, migrations, Kysely queries, RLS           | HIGH     |
| **ebook-processing-expert** | EPUB/MOBI/PDF parsing, metadata extraction, covers           | HIGH     |
| **metadata-expert**         | OpenLibrary, WikiData, ISNI, VIAF, reconciliation            | HIGH     |
| **infrastructure-expert**   | OAuth, shared utilities, cryptography, ESLint/Prettier       | MEDIUM   |
| **tech-lead**               | Architecture decisions, feature planning, cross-cutting work | HIGH     |
| **technical-writer**        | Documentation, README files, user guides, content            | MEDIUM   |

### Agent Usage Requirements

1. **ALWAYS delegate to the appropriate agent** when working in their domain
2. **Agents have comprehensive memory** of codebase structure, patterns, conventions, and testing strategies
3. **For cross-cutting concerns**, use the tech-lead agent to coordinate between specialists
4. **When exploring unfamiliar code**, start with the relevant domain agent
5. **Multiple agents can work in parallel** for complex tasks spanning multiple domains

### Example Agent Delegation

```
User: "Add a new tRPC route for managing user preferences"
→ Use web-app-expert (tRPC routes, authentication)

User: "Parse ASIN from a MOBI file"
→ Use ebook-processing-expert (MOBI parsing)

User: "Add a new database table for notifications"
→ Use database-expert (schema design, migrations)

User: "Create a new Button variant"
→ Use ui-components-expert (Svelte components, Tailwind)

User: "Implement a new metadata provider"
→ Use metadata-expert (provider patterns, caching)
```

## Key File Locations

### Configuration

| File                   | Purpose                         |
| ---------------------- | ------------------------------- |
| `turbo.json`           | Turborepo build pipeline        |
| `pnpm-workspace.yaml`  | Workspace configuration         |
| `lefthook.yaml`        | Git hooks                       |
| `supabase/config.toml` | Supabase/database configuration |
| `.env.example`         | Environment variables template  |

### Database

| File                           | Purpose                    |
| ------------------------------ | -------------------------- |
| `supabase/schemas/*.sql`       | Schema definitions (00-22) |
| `supabase/migrations/*.sql`    | Incremental migrations     |
| `packages/sdk/src/schema.d.ts` | Generated TypeScript types |
| `packages/sdk/src/database.ts` | Kysely initialization      |

### API

| File                                  | Purpose                 |
| ------------------------------------- | ----------------------- |
| `apps/app/src/lib/trpc/router.ts`     | tRPC router setup       |
| `apps/app/src/lib/trpc/routes/*.ts`   | Domain-specific routes  |
| `apps/app/src/lib/trpc/middleware.ts` | Auth middleware         |
| `apps/app/src/hooks.server.ts`        | Server hooks/middleware |

### Components

| File                              | Purpose                 |
| --------------------------------- | ----------------------- |
| `packages/ui/src/lib/ui/index.ts` | Component exports       |
| `packages/ui/.storybook/main.ts`  | Storybook configuration |
| `apps/app/src/lib/components/`    | App-specific components |

## Common Tasks

### Adding a New tRPC Route

1. Create route file in `apps/app/src/lib/trpc/routes/`
2. Export router from the file
3. Import and add to `router.ts`
4. Use guards for authentication: `procedure.use(guards.authenticated)`

### Adding a New Database Table

1. Add schema in `supabase/schemas/XX_name.sql`
2. Create migration in `supabase/migrations/`
3. Run `cd packages/sdk && pnpm types` to regenerate types
4. Add resource functions in `packages/sdk/src/resources/`

### Adding a New UI Component

1. Create component in `packages/ui/src/lib/ui/ComponentName/`
2. Export from `packages/ui/src/lib/ui/index.ts`
3. Add Storybook story as `ComponentName.stories.svelte`
4. Use bits-ui primitives where applicable

### Adding a New CLI Command

1. Create command in `apps/cli/src/commands/topic/name.ts`
2. Extend `BaseCommand` for shared functionality
3. Use flags from `apps/cli/src/flags/` for consistency
4. Update oclif manifest: `pnpm -F cli run build`

### Working on Planned Features

Feature plans are tracked in `plans/*.md` with corresponding GitHub issues. After implementing a feature:

1. **Update the plan file** in `plans/` to reflect current status:
   - Move items from "Remaining Work" to "Implemented"
   - Update "Current Implementation Status" section
   - Note any decisions made or scope changes
2. **Update the GitHub issue** (linked at top of each plan file):
   - Add comments with progress updates
   - Check off completed items if using task lists
   - Close the issue when the feature is complete
3. **Reference the issue** in commit messages: `Implements #123` or `Closes #123`

This ensures plans stay synchronized with actual implementation progress.

## Metadata Providers

The SDK supports multiple metadata providers for book enrichment:

| Provider         | Data Types             |
| ---------------- | ---------------------- |
| OpenLibrary      | Books, authors, covers |
| WikiData         | Authors, publishers    |
| VIAF             | Authority records      |
| ISNI             | Author identifiers     |
| ISBNdb           | Books, ISBNs           |
| Google Books     | Books, covers          |
| Internet Archive | Books, full text       |
| Crossref         | Academic works         |
| Springer         | Academic books         |

**Features:**

- Rate limiting per provider
- Caching with TTL
- Confidence scoring for merging
- Fuzzy matching for deduplication

## Ebook Processing

### Supported Formats

| Format | Parser               | Features                         |
| ------ | -------------------- | -------------------------------- |
| EPUB   | @zip.js/zip.js + XML | Metadata, cover, TOC, v2/v3      |
| MOBI   | packages/mobi        | Metadata, cover (binary parsing) |
| PDF    | pdf.js               | Metadata, page count             |
| AZW3   | packages/mobi        | Kindle format variant            |

### Ingestion Pipeline

1. **Extract Metadata** - Parse file & detect format
2. **Enrich (Optional)** - Query external providers
3. **Duplicate Detection** - Check by checksum, ISBN, fuzzy title
4. **Process Contributors** - Find/create creators with fuzzy matching
5. **Cover Processing** - Extract cover, generate blurhash
6. **Create Records** - Transactional database inserts

## Real-time Features

### Server-Sent Events (SSE)

| Endpoint              | Purpose                        |
| --------------------- | ------------------------------ |
| `/api/import-events`  | Upload progress, import status |
| `/api/comment-events` | New comments, reactions        |

### Client Implementation

```typescript
// apps/app/src/lib/components/Upload/ImportSubscription.svelte
const eventSource = new EventSource('/api/import-events');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle import progress
};
```
