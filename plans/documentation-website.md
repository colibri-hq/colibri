# Documentation Website

## Description

A comprehensiv e documentation website for Colibri built with [Statue](https://statue.dev) static site generator. The site will provide end-user guides, developer documentation, package API references, and setup instructions. Statue is a SvelteKit-based SSG that uses markdown files for content, making it ideal for technical documentation.

## Current Implementation Status

**Completed:**

- ✅ Statue project initialization (SvelteKit + statue-ssg)
- ✅ Site structure and navigation (NavigationBar with 6 sections)
- ✅ Home page with Colibri branding (blue theme)
- ✅ Getting Started section (introduction, quick-start, requirements)
- ✅ Setup Guide section (installation, configuration, storage)
- ✅ User Guide section (library, uploads, metadata, collections, settings)
- ✅ CLI Documentation (overview, works, creators, storage commands)
- ✅ Package Documentation (SDK, MOBI, PDF, OAuth, Open Library, Languages)
- ✅ API placeholder (coming soon page)
- ✅ Plugin placeholder (coming soon page)
- ✅ Contributing guide (development setup)
- ✅ Static adapter configuration for Cloudflare Pages
- ✅ CNAME file for docs.colibri.app

**Pending:**

- ❌ Cloudflare Pages deployment setup
- ❌ Additional content expansion (more detailed pages)
- ❌ Search integration

**Existing Documentation to Leverage:**

- ✅ `packages/sdk/src/metadata/README.md` - Comprehensive metadata SDK guide (~1000 lines)
- ✅ `packages/sdk/src/ingestion/README.md` - Ingestion pipeline documentation
- ✅ `packages/mobi/README.md` - Complete MOBI parser API reference
- ✅ `packages/open-library-client/README.md` - Full Open Library client docs
- ✅ `apps/cli/README.md` - CLI command reference (~2000 lines)
- ✅ `CLAUDE.md` - Project overview and architecture

## Implementation Plan

### Phase 1: Statue Project Setup

1. Initialize Statue in `apps/docs`:
   ```bash
   cd apps/docs
   npx sv create . --template minimal --types ts --no-add-ons --install npm
   npm install statue-ssg
   npx statue init  # Use default template for documentation focus
   ```

2. Configure `site.config.js`:
   ```javascript
   export default {
     siteName: "Colibri",
     siteDescription: "Self-hosted ebook library with metadata enrichment",
     baseUrl: "https://docs.colibri.app",
     contact: {
       email: "support@colibri.app",
       github: "https://github.com/colibri-hq/colibri"
     },
     social: {
       github: "colibri-hq/colibri",
       discord: "..."  // If available
     },
     copyright: {
       text: "Colibri",
       startYear: 2024
     }
   };
   ```

3. Configure Turborepo integration in `apps/docs/package.json`:
   ```json
   {
     "name": "@colibri-hq/docs",
     "scripts": {
       "dev": "npm run build && npm run preview",
       "build": "npm run build",
       "preview": "npm run preview"
     }
   }
   ```

4. Choose and configure theme in `src/lib/index.css`:
   ```css
   /* Use blue theme to match Colibri branding */
   @import "statue-ssg/themes/blue.css";
   ```

**Reference:** [Statue Getting Started](https://statue.dev/docs/)

### Phase 2: Site Structure and Navigation

1. Create content directory structure:
   ```
   content/
   ├── getting-started/
   │   ├── _index.md           # Directory index
   │   ├── introduction.md
   │   ├── requirements.md
   │   └── quick-start.md
   ├── setup/
   │   ├── _index.md
   │   ├── installation.md
   │   ├── configuration.md
   │   ├── docker.md
   │   ├── database.md
   │   └── storage.md
   ├── user-guide/
   │   ├── _index.md
   │   ├── library-management.md
   │   ├── uploading-books.md
   │   ├── metadata-enrichment.md
   │   ├── collections.md
   │   ├── search-and-discovery.md
   │   ├── reading-and-downloads.md
   │   ├── comments-and-reviews.md
   │   └── settings.md
   ├── cli/
   │   ├── _index.md
   │   ├── installation.md
   │   ├── configuration.md
   │   ├── works-commands.md
   │   ├── creators-commands.md
   │   ├── publishers-commands.md
   │   ├── storage-commands.md
   │   ├── settings-commands.md
   │   ├── users-commands.md
   │   └── oauth-commands.md
   ├── packages/
   │   ├── _index.md
   │   ├── sdk/
   │   │   ├── _index.md
   │   │   ├── database.md
   │   │   ├── metadata.md
   │   │   ├── ingestion.md
   │   │   ├── storage.md
   │   │   ├── ebooks.md
   │   │   └── resources.md
   │   ├── mobi/
   │   │   └── _index.md
   │   ├── pdf/
   │   │   └── _index.md
   │   ├── oauth/
   │   │   └── _index.md
   │   ├── open-library-client/
   │   │   └── _index.md
   │   └── languages/
   │       └── _index.md
   ├── api/
   │   ├── _index.md           # Placeholder
   │   └── endpoints.md        # Placeholder
   ├── plugins/
   │   ├── _index.md           # Placeholder
   │   └── development.md      # Placeholder
   └── contributing/
       ├── _index.md
       ├── development-setup.md
       └── architecture.md
   ```

2. Configure navigation in `src/routes/+layout.svelte`:
   ```svelte
   <script>
     import { NavigationBar } from "statue-ssg";

     const navbarItems = [
       { label: "Getting Started", href: "/getting-started" },
       { label: "Setup", href: "/setup" },
       { label: "User Guide", href: "/user-guide" },
       { label: "CLI", href: "/cli" },
       { label: "Packages", href: "/packages" },
       { label: "API", href: "/api" },
       { label: "Plugins", href: "/plugins" }
     ];
   </script>

   <NavigationBar {navbarItems} activePath={$page.url.pathname} />
   ```

**Reference:** [Statue Components](https://statue.dev/docs/components)

### Phase 3: Home Page and Landing Content

1. Design homepage (`src/routes/+page.svelte`):
   ```svelte
   <script>
     import { Hero, Categories, LatestContent } from "statue-ssg";
   </script>

   <Hero />

   <Categories directories={[
     { title: "Getting Started", url: "/getting-started", name: "Quick introduction to Colibri" },
     { title: "Setup Guide", url: "/setup", name: "Install and configure your instance" },
     { title: "User Guide", url: "/user-guide", name: "Learn all features" },
     { title: "CLI Reference", url: "/cli", name: "Command-line interface" },
     { title: "Package Docs", url: "/packages", name: "SDK and library APIs" }
   ]} />
   ```

2. Create `content/getting-started/introduction.md`:
   ```markdown
   ---
   title: Introduction to Colibri
   description: Learn what Colibri is and what it can do for your ebook library
   date: 2024-01-01
   ---

   # Introduction to Colibri

   Colibri is a self-hosted ebook library application...
   ```

### Phase 4: Getting Started Section

1. **Introduction** (`content/getting-started/introduction.md`):
   - What is Colibri
   - Key features overview
   - Architecture summary (web app, CLI, database)
   - Screenshot gallery

2. **Requirements** (`content/getting-started/requirements.md`):
   - Node.js 18+
   - PostgreSQL 15+ (via Supabase or standalone)
   - S3-compatible storage
   - System requirements (RAM, disk space)

3. **Quick Start** (`content/getting-started/quick-start.md`):
   - 5-minute setup with Docker Compose
   - First book upload
   - Basic navigation tour

### Phase 5: Setup Guide Section

1. **Installation** (`content/setup/installation.md`):
   - Clone repository
   - Install dependencies (`pnpm install`)
   - Environment setup (`.env` configuration)
   - Development vs production modes

2. **Configuration** (`content/setup/configuration.md`):
   - Environment variables reference
   - `site.config.js` options
   - Instance settings
   - User roles and permissions

3. **Docker Setup** (`content/setup/docker.md`):
   - Docker Compose configuration
   - Container architecture
   - Volume mounts
   - Networking

4. **Database Setup** (`content/setup/database.md`):
   - Supabase local setup (`pnpx supabase start`)
   - Remote Supabase configuration
   - Standalone PostgreSQL
   - Migrations and schema

5. **Storage Configuration** (`content/setup/storage.md`):
   - S3-compatible storage options
   - MinIO setup (local development)
   - AWS S3 configuration
   - Backblaze B2, Cloudflare R2 alternatives

### Phase 6: User Guide Section (Comprehensive Help)

1. **Library Management** (`content/user-guide/library-management.md`):
   - Viewing works and editions
   - Sorting and filtering
   - Grid vs list views
   - Work details page

2. **Uploading Books** (`content/user-guide/uploading-books.md`):
   - Supported formats (EPUB, MOBI, PDF)
   - Upload modal walkthrough
   - Bulk upload
   - Duplicate detection
   - Queue status monitoring

3. **Metadata Enrichment** (`content/user-guide/metadata-enrichment.md`):
   - Automatic metadata fetching
   - Manual enrichment triggers
   - Provider selection
   - Confidence scores
   - Reviewing and accepting suggestions
   - Conflict resolution

4. **Collections** (`content/user-guide/collections.md`):
   - Creating collections
   - Adding/removing works
   - Collection visibility (public/private)
   - Collection icons and customization

5. **Search and Discovery** (`content/user-guide/search-and-discovery.md`):
   - Full-text search
   - Filter by author, publisher, series
   - External catalogs (OPDS)
   - Discover page features

6. **Reading and Downloads** (`content/user-guide/reading-and-downloads.md`):
   - Download formats
   - Reading progress (future)
   - OPDS feed access

7. **Comments and Reviews** (`content/user-guide/comments-and-reviews.md`):
   - Adding comments
   - Threaded replies
   - Emoji reactions
   - Ratings and reviews
   - Moderation features

8. **Settings** (`content/user-guide/settings.md`):
   - Profile settings
   - Passkey management
   - Instance settings (admin)
   - Metadata provider configuration
   - User management

### Phase 7: CLI Documentation

Source: Adapt content from `apps/cli/README.md`

1. **CLI Overview** (`content/cli/_index.md`):
   - Installation (`npm install -g @colibri-hq/cli`)
   - Authentication (`colibri connect`, `colibri login`)
   - Command structure

2. **Works Commands** (`content/cli/works-commands.md`):
   ```markdown
   ## colibri works add
   Add a new work to the library from a local file.

   ### Usage
   ```bash
   colibri works add <file>
   ```

   ### Options
   - `--title` - Override extracted title
   - `--author` - Override extracted author
   ...
   ```

3. **Creators Commands** (`content/cli/creators-commands.md`)
4. **Publishers Commands** (`content/cli/publishers-commands.md`)
5. **Storage Commands** (`content/cli/storage-commands.md`)
6. **Settings Commands** (`content/cli/settings-commands.md`)
7. **Users Commands** (`content/cli/users-commands.md`)
8. **OAuth Commands** (`content/cli/oauth-commands.md`)

### Phase 8: Package Documentation

#### SDK Package (`content/packages/sdk/`)

Source: Adapt from `packages/sdk/src/metadata/README.md` and `packages/sdk/src/ingestion/README.md`

1. **Overview** (`_index.md`):
   - Installation
   - Module exports structure
   - TypeScript support

2. **Database** (`database.md`):
   - Kysely ORM integration
   - Connection management
   - Transaction handling
   - Schema types

3. **Metadata** (`metadata.md`):
   - Provider architecture
   - Aggregator usage
   - Confidence scoring
   - Available providers table:
     | Provider | Free | Features |
     |----------|------|----------|
     | OpenLibrary | Yes | Books, authors, covers |
     | WikiData | Yes | Authors, publishers, links |
     | Library of Congress | Yes | Authority records |
     | Google Books | API key | Covers, descriptions |
     | ... | ... | ... |

4. **Ingestion** (`ingestion.md`):
   - Pipeline overview
   - Duplicate detection
   - Metadata conversion
   - Enrichment strategies

5. **Storage** (`storage.md`):
   - S3 abstraction
   - File operations
   - Presigned URLs

6. **Ebooks** (`ebooks.md`):
   - Format support (EPUB, MOBI, PDF)
   - Metadata extraction
   - Cover extraction

7. **Resources** (`resources.md`):
   - Database models
   - CRUD operations
   - Query patterns

#### MOBI Package (`content/packages/mobi/_index.md`)

Source: Adapt from `packages/mobi/README.md`

- Parser API
- Metadata extraction
- Cover extraction
- Code examples

#### PDF Package (`content/packages/pdf/_index.md`)

- Conditional exports (node/browser/worker)
- PDF.js wrapper usage
- Metadata extraction

#### OAuth Package (`content/packages/oauth/_index.md`)

- OAuth 2.0 server implementation
- Grant types
- Token management
- Integration guide

#### Open Library Client (`content/packages/open-library-client/_index.md`)

Source: Adapt from `packages/open-library-client/README.md`

- Client initialization
- Search APIs
- Pagination
- Browser and Node.js usage

#### Languages Package (`content/packages/languages/_index.md`)

- ISO 639-3 language codes
- Resolution functions
- Usage examples

### Phase 9: API Documentation (Placeholder)

Create placeholder content for future HTTP API:

1. **Overview** (`content/api/_index.md`):
   ```markdown
   ---
   title: HTTP API
   description: REST API documentation for Colibri
   ---

   # HTTP API

   > **Coming Soon**: The public HTTP API is currently under development.
   >
   > In the meantime, see the [CLI documentation](/cli) for programmatic access,
   > or explore the [tRPC routes](https://github.com/colibri-hq/colibri/tree/main/apps/app/src/lib/trpc/routes)
   > for internal API structure.

   ## Planned Endpoints

   - `/api/v1/works` - Work management
   - `/api/v1/creators` - Creator management
   - `/api/v1/collections` - Collection management
   - `/api/v1/search` - Search functionality
   ```

2. **Endpoints Reference** (`content/api/endpoints.md`):
   - Placeholder tables for future endpoints
   - Authentication overview
   - Rate limiting notes

### Phase 10: Plugin Development (Placeholder)

Create placeholder for future plugin system:

1. **Overview** (`content/plugins/_index.md`):
   ```markdown
   ---
   title: Plugin Development
   description: Build extensions for Colibri
   ---

   # Plugin Development

   > **Coming Soon**: The plugin system is currently under development.
   >
   > We're designing a flexible plugin architecture that will allow:
   >
   > - Custom metadata providers
   > - Additional ebook format support
   > - UI extensions
   > - Storage backends
   > - Authentication providers

   ## Interested in Contributing?

   Join our [GitHub Discussions](https://github.com/colibri-hq/colibri/discussions)
   to share ideas and help shape the plugin API.
   ```

### Phase 11: Contributing Section

1. **Development Setup** (`content/contributing/development-setup.md`):
   - Fork and clone
   - Dependency installation
   - Local Supabase setup
   - Running development servers
   - Running tests

2. **Architecture Overview** (`content/contributing/architecture.md`):
   - Monorepo structure
   - Package dependencies
   - Data flow diagrams
   - Key patterns (Kysely, tRPC, Svelte 5)

### Phase 12: Footer and Legal Pages

1. Configure footer in layout:
   ```svelte
   <Footer
     directories={directories}
     legalLinks={[
       { label: "Privacy", href: "/privacy" },
       { label: "Terms", href: "/terms" }
     ]}
     socialLinks={socialLinks}
   />
   ```

2. Create legal pages (minimal placeholders):
   - `content/privacy.md`
   - `content/terms.md`

### Phase 13: Search and Special Features

1. Implement search functionality using Statue's built-in features or add Pagefind:
   ```bash
   npm install pagefind
   ```

2. Add syntax highlighting for code blocks (if not included by default)

3. Configure callout components using Statue's `Warning` component:
   ```markdown
   <Warning type="info">
   This feature requires admin permissions.
   </Warning>
   ```

### Phase 14: Build and Deployment

1. Configure build script in `apps/docs/package.json`:
   ```json
   {
     "scripts": {
       "build": "vite build",
       "preview": "vite preview"
     }
   }
   ```

2. Add to root `turbo.json`:
   ```json
   {
     "pipeline": {
       "build": {
         "dependsOn": ["^build"],
         "outputs": ["build/**"]
       }
     }
   }
   ```

3. Configure Cloudflare Pages deployment:
   - Connect GitHub repository to Cloudflare Pages
   - Build command: `pnpm build:docs` (or `npm run build` in apps/docs)
   - Build output directory: `apps/docs/build`
   - Environment variables: None required for static site
   - Configure custom domain: `docs.colibri.app`

4. Optional: Add `wrangler.toml` for local Cloudflare Pages dev:
   ```toml
   name = "colibri-docs"
   compatibility_date = "2024-01-01"
   ```

### Phase 15: Content Migration and Polish

1. Convert existing README content to markdown pages:
   - `packages/sdk/src/metadata/README.md` → `content/packages/sdk/metadata.md`
   - `packages/sdk/src/ingestion/README.md` → `content/packages/sdk/ingestion.md`
   - `packages/mobi/README.md` → `content/packages/mobi/_index.md`
   - `packages/open-library-client/README.md` → `content/packages/open-library-client/_index.md`
   - `apps/cli/README.md` → Split into multiple CLI pages

2. Add screenshots and diagrams:
   - Upload modal screenshots
   - Metadata enrichment flow diagram
   - Architecture diagram
   - CLI usage examples (terminal screenshots)

3. Review and polish:
   - Consistent heading hierarchy
   - Cross-linking between pages
   - Code example verification
   - Frontmatter metadata

## Statue Configuration Reference

### Key Files

| File | Purpose |
|------|---------|
| `site.config.js` | Site-wide configuration (name, URLs, social) |
| `src/lib/index.css` | Theme selection |
| `src/routes/+layout.svelte` | Navigation and footer |
| `src/routes/+page.svelte` | Homepage |
| `content/` | All markdown content |
| `static/` | Images, favicon, logos |

### Frontmatter Structure

```markdown
---
title: Page Title
description: SEO description
date: 2024-01-01
author: Author Name (optional)
tags: [tag1, tag2] (optional)
---
```

### Template Variables

Available in markdown files:
- `{{siteName}}` - From `site.config.js`
- `{{currentYear}}` - Current year
- `{{siteDescription}}` - From config

### Useful Components

```svelte
import {
  NavigationBar,    // Top navigation
  Hero,             // Landing hero section
  Categories,       // Content category cards
  PageHero,         // Page title section
  ContentHeader,    // Article header with metadata
  ContentBody,      // Rendered markdown content
  Footer,           // Site footer
  Warning,          // Callout boxes (info/warning/error/success)
  CollapsibleTree   // Nested navigation trees
} from "statue-ssg";
```

### Theming

Change theme in `src/lib/index.css`:
```css
/* Available themes: blue, red, orange, green, purple, cyan, pink, black-white */
@import "statue-ssg/themes/blue.css";
```

Custom theme requires defining 12 CSS variables (see [Statue Theming](https://statue.dev/docs/themes)).

## File Summary

| Location                      | Purpose                        |
|-------------------------------|--------------------------------|
| `apps/docs/`                  | Documentation site root        |
| `apps/docs/site.config.js`    | Statue configuration           |
| `apps/docs/src/`              | Svelte routes and components   |
| `apps/docs/content/`          | Markdown documentation         |
| `apps/docs/static/`           | Static assets                  |
| `apps/docs/wrangler.toml`     | Cloudflare Pages config (opt.) |

## Content Priority

**High Priority (Core Documentation):**
1. Getting Started (introduction, quick-start)
2. Setup Guide (installation, configuration)
3. User Guide (all sections)
4. CLI Reference

**Medium Priority (Developer Documentation):**
1. SDK Package documentation
2. Contributing guide
3. Architecture overview

**Lower Priority (Placeholders for Future):**
1. HTTP API (placeholder)
2. Plugin Development (placeholder)
3. Other package docs (mobi, pdf, etc.)

## Decisions Made

- **Domain**: `docs.colibri.app`
- **Theme**: Built-in blue theme (can customize later if needed)
- **Screenshots**: Minimal for initial release, add incrementally
- **Deployment**: Cloudflare Pages

## Open Questions

1. **Versioning**: Do we need documentation versioning for different Colibri releases?
2. **Search**: Use Statue's built-in search or integrate Pagefind/Algolia?
3. **Internationalization**: Plan for future translations?
4. **Community**: Include community links (Discord, GitHub Discussions) in navigation?
5. **Analytics**: Add privacy-respecting analytics (Plausible, Fathom)?
