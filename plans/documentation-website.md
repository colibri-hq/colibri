> **GitHub Issue:** [#127](https://github.com/colibri-hq/colibri/issues/127)

# Documentation Website

## Description

A comprehensive documentation website for Colibri built as a custom SvelteKit application with mdsvex for markdown processing. The site provides end-user guides, developer documentation, package API references, and setup instructions. Unlike the original plan to use Statue SSG, a custom implementation was chosen to provide more flexibility and polish for showcasing Colibri as a top-tier digital library platform.

## Current Implementation Status

### ✅ **Phase 1: Core Infrastructure (COMPLETED)**

**Technical Stack:**

- ✅ Custom SvelteKit application (NOT Statue - more flexible)
- ✅ mdsvex for markdown processing with custom preprocessors
- ✅ Pagefind integration for search (with keyboard shortcut Cmd/Ctrl+K)
- ✅ Shiki for beautiful syntax highlighting (light/dark theme support)
- ✅ Mermaid for diagrams
- ✅ Tailwind CSS 4 for styling
- ✅ Custom markdown components (Callout, Code, Table, etc.)
- ✅ Rehype plugins (slug, unwrap-images, mermaid)
- ✅ Remark plugins (GFM, TOC, extract headings, remove duplicate titles, glossary links)
- ✅ Dual adapter support (static for local, Cloudflare for production)
- ✅ RSS feed generation
- ✅ Robots.txt and sitemap
- ✅ JSON-LD structured data
- ✅ Link preview system with hover popovers
- ✅ Reading time estimation
- ✅ Git-based last modified dates
- ✅ CNAME file for docs.colibri.app

**Design & UX:**

- ✅ Beautiful polished homepage with animated hummingbirds (cinematic touch)
- ✅ Responsive navigation with mobile support
- ✅ View transitions for smooth page navigation
- ✅ Dark mode support throughout
- ✅ Professional hero section with gradient orbs
- ✅ Feature showcase sections
- ✅ Documentation section cards

### ✅ **Phase 2: Content Structure (COMPLETED)**

**Content Volume:** ~16,800 lines of documentation across 40+ markdown files

**Getting Started Section (COMPLETED):**

- ✅ Introduction (comprehensive overview for book enthusiasts, 99 lines)
- ✅ Requirements (system requirements, dependencies)
- ✅ Quick Start (fast setup guide)
- ✅ Contributing
  - ✅ Overview/index
  - ✅ Development setup
  - ✅ Guidelines
  - ✅ Architecture

**Setup Guide Section (COMPLETED):**

- ✅ Installation (detailed setup instructions)
- ✅ Configuration (environment variables, settings)
- ✅ Storage (S3-compatible storage configuration)
- ✅ Architecture overview
- ✅ Deployment (Docker Compose, Node.js, Serverless)
- ✅ Troubleshooting

**User Guide Section (COMPREHENSIVE):**

- ✅ Library Management (500+ lines - extensive guide)
- ✅ Uploading Books (format support, duplicate detection)
- ✅ Metadata Enrichment (provider details, reconciliation)
- ✅ Collections (organization, sharing)
- ✅ Search (full-text search, advanced features)
- ✅ Authentication (Passkeys, WebAuthn)
- ✅ Settings (user preferences, admin settings)
- ✅ Reviews & Ratings

**CLI Documentation (COMPLETE):**

- ✅ Overview/index
- ✅ Works commands
- ✅ Creators commands
- ✅ Publishers commands
- ✅ Storage commands
- ✅ Users commands
- ✅ OAuth commands

**Package Documentation (COMPLETE):**

- ✅ SDK package
  - ✅ Overview/index
  - ✅ Metadata (providers, aggregation)
  - ✅ Ingestion (pipeline documentation)
- ✅ MOBI package
- ✅ PDF package
- ✅ OAuth package
- ✅ Open Library Client package
- ✅ Languages package

**API Documentation:**

- ✅ tRPC reference (internal API structure)
- ✅ API overview page

**Plugins:**

- ✅ Plugin development placeholder (future feature)

**Additional Content:**

- ✅ Blog section with introducing post
- ✅ Legal section (privacy, terms placeholders)
- ✅ Changelog page

### 🔄 **What Changed From Original Plan**

The implementation deviated significantly from the Statue-based plan:

1. **Custom SvelteKit vs. Statue**: Team chose to build a custom documentation site instead of using Statue SSG, enabling:
   - More control over design and UX
   - Better integration with Colibri's design language
   - Custom features like link previews and advanced search
   - Blog functionality with layout system

2. **Polish Level**: Far exceeds original plan with:
   - Animated hummingbird graphics on homepage
   - Professional hero sections with gradient effects
   - View transitions for smooth navigation
   - Link preview popovers
   - Reading time estimation
   - Git-based timestamps

3. **Content Depth**: Much more comprehensive than planned (~16,800 lines vs. expected ~5,000)

**Leveraged Existing Documentation:**

- ✅ `packages/sdk/src/metadata/README.md` - Integrated into SDK docs
- ✅ `packages/sdk/src/ingestion/README.md` - Integrated into SDK docs
- ✅ `packages/mobi/README.md` - Integrated into package docs
- ✅ `packages/open-library-client/README.md` - Integrated into package docs
- ✅ `apps/cli/README.md` - Split into CLI command pages
- ✅ `CLAUDE.md` - Referenced in architecture docs

---

## Technical Implementation Tasks

> **Note:** Content strategy (screenshots, videos, use cases, etc.) is now documented in `documentation-content-strategy.md`. This plan focuses solely on technical implementation.

### 🏗️ **Priority 1: Code Quality & Refactoring**

#### **1. Refactor Homepage Animations** ⭐ **HIGH PRIORITY**

**Status:** ✅ COMPLETE - Integrated and tested
**Location:** `apps/docs/src/routes/+page.svelte`
**Result:** Reduced homepage from 612 lines to 297 lines (51% reduction)

**Tasks:**

- [x] Create `Hummingbird.svelte` component (DONE)
- [x] Create `HummingbirdFlock.svelte` wrapper (DONE)
- [x] Update `+page.svelte` to use new components (DONE)
- [x] Remove old inline styles (DONE - removed 315 lines)
- [x] Fix Svelte 5 reactivity warnings (DONE - used $derived())
- [x] Test build (DONE - successful)

**Files:**

- ✅ `src/lib/components/hero/Hummingbird.svelte`
- ✅ `src/lib/components/hero/HummingbirdFlock.svelte`
- ✅ `src/lib/components/hero/index.ts`
- ✅ `src/routes/+page.svelte` (updated)

**Benefits:**

- ✅ Removed 315 lines from homepage
- ✅ Reusable across other pages
- ✅ Cleaner Tailwind usage
- ✅ Better TypeScript typing
- ✅ Fixed Svelte 5 reactivity warnings

#### **2. Implement Glossary Tooltips** ⭐ **HIGH PRIORITY**

**Status:** ✅ COMPLETE - Components and markdown integration ready
**Location:** `apps/docs/src/lib/components/glossary/`
**Purpose:** Allow inline definitions for technical terms

**Tasks:**

- [x] Create `GlossaryTerm.svelte` component (DONE)
- [x] Create `glossary-data.ts` with initial terms (DONE)
- [x] Create `/glossary` route (DONE)
- [x] Create remark plugin for markdown syntax (DONE)
- [x] Configure plugin in mdsvex (DONE)
- [x] Export GlossaryTerm in layouts (DONE)
- [ ] Add glossary terms to Getting Started pages
- [ ] Add glossary terms to Setup Guide
- [ ] Add glossary terms to User Guide
- [ ] Expand glossary to 50+ terms
- [ ] Test tooltips on mobile (tap interaction)
- [ ] Add glossary link to site footer/navigation

**Files:**

- ✅ `src/lib/components/glossary/GlossaryTerm.svelte`
- ✅ `src/lib/components/glossary/glossary-data.ts`
- ✅ `src/lib/components/glossary/index.ts`
- ✅ `src/routes/glossary/+page.svelte`
- ✅ `src/lib/remark/remark-glossary-links.js`
- ✅ `svelte.config.js` (plugin configured)
- ✅ `src/lib/components/layouts/DefaultLayout.svelte` (exports GlossaryTerm)
- ✅ `src/lib/components/layouts/BlogPostLayout.svelte` (exports GlossaryTerm)

**Markdown Syntax:**

```markdown
Colibri requires [PostgreSQL](glossary:postgresql) and [S3 storage](glossary:s3) to run.
```

**Manual Usage (when needed):**

```svelte
<GlossaryTerm term="postgresql">PostgreSQL</GlossaryTerm>
<GlossaryTerm term="epub" />
<GlossaryTerm term="metadata">book info</GlossaryTerm>
```

#### **3. Extract Reusable Components**

**Purpose:** DRY principle, consistent styling

**Tasks:**

- [ ] Create `HeroSection.svelte` component
  - [ ] Extract gradient orbs as subcomponent
  - [ ] Prop-based customization
- [ ] Create `FeatureCard.svelte` component
  - [ ] Used in "Simple by design" section
  - [ ] Icon, title, description props
- [ ] Create `CTASection.svelte` component
  - [ ] Reusable call-to-action sections
  - [ ] Primary/secondary button variants
- [ ] Create `ContentSection.svelte` wrapper
  - [ ] Standard spacing and max-width
  - [ ] Optional background variants

**Files to Create:**

- `src/lib/components/sections/HeroSection.svelte`
- `src/lib/components/sections/FeatureCard.svelte`
- `src/lib/components/sections/CTASection.svelte`
- `src/lib/components/sections/ContentSection.svelte`

#### **4. Code Organization**

**Tasks:**

- [ ] Move all custom components to `$lib/components/`
- [ ] Create component documentation (TSDoc comments)
- [ ] Add prop type definitions with TypeScript
- [ ] Create Storybook stories (optional, for UI library)
- [ ] Ensure all components follow Svelte 5 patterns
- [ ] Remove unused imports and code
- [ ] Run ESLint and Prettier on all files

#### **5. Performance Optimization**

**Tasks:**

- [ ] Lazy-load images using `loading="lazy"`
- [ ] Add blurhash placeholders for hero images
- [ ] Optimize SVG assets (SVGO)
- [ ] Enable image optimization in build
- [ ] Analyze bundle size with Vite bundle analyzer
- [ ] Code-split large dependencies
- [ ] Preload critical fonts
- [ ] Add resource hints (preconnect, dns-prefetch)

### 🚀 **Priority 2: Deployment & Infrastructure**

#### **1. Cloudflare Pages Deployment** ⭐ **HIGH PRIORITY**

**Status:** Ready to deploy
**Tasks:**

- [ ] Create Cloudflare Pages project
- [ ] Configure build settings:
  - Build command: `ADAPTER=cloudflare pnpm build:ci`
  - Output directory: `.svelte-kit/cloudflare`
  - Root directory: `apps/docs`
- [ ] Set environment variables:
  - `PUBLIC_SITE_URL=https://docs.colibri.app`
- [ ] Configure custom domain: docs.colibri.app
- [ ] Set up automatic deployments from `main` branch
- [ ] Configure preview deployments for PRs
- [ ] Test deployment thoroughly
- [ ] Add deployment status badge to README

**DNS Configuration:**

- [ ] Add CNAME record: `docs.colibri.app` → Cloudflare Pages URL
- [ ] Enable DNSSEC (if applicable)
- [ ] Verify SSL certificate provisioning

#### **2. Build & CI/CD**

**Tasks:**

- [ ] Add GitHub Actions workflow for docs
- [ ] Run type checking (`svelte-check`)
- [ ] Run linting (`eslint`)
- [ ] Run tests (if any)
- [ ] Build site and verify no errors
- [ ] Run Pagefind indexing
- [ ] Cache dependencies for faster builds
- [ ] Deploy to Cloudflare Pages on merge to main

**Files to Create:**

- `.github/workflows/docs.yml`

#### **3. Monitoring & Analytics**

**Tasks:**

- [ ] Set up privacy-respecting analytics:
  - Option 1: Plausible Analytics
  - Option 2: Fathom Analytics
  - Option 3: Cloudflare Web Analytics (free)
- [ ] Add analytics script to layout
- [ ] Configure goals/events:
  - Page views
  - Search queries
  - Outbound link clicks
  - "Get Started" button clicks
- [ ] Set up uptime monitoring (UptimeRobot, Better Uptime)
- [ ] Configure error tracking (Sentry optional)

### 📊 **Priority 3: SEO & Discoverability**

#### **1. SEO Optimization**

**Tasks:**

- [ ] Optimize all page titles (format: "Page Title | Colibri Docs")
- [ ] Write unique meta descriptions for all pages (<160 chars)
- [ ] Add Open Graph meta tags:
  - `og:title`, `og:description`, `og:image`, `og:url`
- [ ] Add Twitter Card meta tags:
  - `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- [ ] Create Open Graph images for homepage and key pages
- [ ] Generate sitemap.xml (already have, verify)
- [ ] Generate robots.txt (already have, verify)
- [ ] Add structured data (JSON-LD):
  - WebSite schema
  - BreadcrumbList schema
  - Article schema for blog posts
  - SoftwareApplication schema for Colibri
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Verify Google Analytics property (if using)

#### **2. Performance & Core Web Vitals**

**Tasks:**

- [ ] Run Lighthouse audit and fix issues
- [ ] Optimize Largest Contentful Paint (LCP) <2.5s
- [ ] Optimize First Input Delay (FID) <100ms
- [ ] Optimize Cumulative Layout Shift (CLS) <0.1
- [ ] Add critical CSS inline
- [ ] Defer non-critical JavaScript
- [ ] Minimize third-party scripts
- [ ] Add cache headers for static assets
- [ ] Enable Brotli/gzip compression
- [ ] Optimize font loading (font-display: swap)

#### **3. Accessibility Audit**

**Tasks:**

- [ ] Run axe DevTools audit on all pages
- [ ] Ensure all images have meaningful alt text
- [ ] Verify keyboard navigation works everywhere
- [ ] Test with screen reader (NVDA/JAWS/VoiceOver)
- [ ] Ensure color contrast meets WCAG AA standards
- [ ] Add skip-to-content link
- [ ] Ensure focus indicators are visible
- [ ] Test with browser zoom at 200%
- [ ] Verify ARIA labels are appropriate
- [ ] Add lang attribute to HTML

### 🔍 **Priority 4: Search & Navigation**

#### **1. Search Enhancements**

**Tasks:**

- [x] Pagefind integration (DONE)
- [ ] Customize Pagefind UI colors/styling
- [ ] Add search filters:
  - [ ] By section (Getting Started, User Guide, etc.)
  - [ ] By tags/topics
- [ ] Add keyboard shortcuts modal (`?` key)
- [ ] Show recent searches (local storage)
- [ ] Add "Did you mean...?" suggestions
- [ ] Index glossary terms for search
- [ ] Test search on mobile

#### **2. Navigation Improvements**

**Tasks:**

- [ ] Add breadcrumb navigation
- [ ] Add "On this page" table of contents (sticky sidebar)
- [ ] Add prev/next page navigation
- [ ] Highlight current page in nav
- [ ] Add "Related pages" section at bottom
- [ ] Create site-wide navigation tree component
- [ ] Mobile navigation improvements
- [ ] Add quick links to common pages

### 🧪 **Priority 5: Testing & Quality Assurance**

#### **1. Browser Testing**

**Tasks:**

- [ ] Test in Chrome/Chromium
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Verify all features work in each browser
- [ ] Document any browser-specific issues

#### **2. Responsive Testing**

**Tasks:**

- [ ] Test on mobile (320px - 480px)
- [ ] Test on tablet (768px - 1024px)
- [ ] Test on laptop (1280px - 1440px)
- [ ] Test on desktop (1920px+)
- [ ] Test on ultrawide (2560px+)
- [ ] Verify images scale appropriately
- [ ] Verify navigation works on all sizes

#### **3. Content Validation**

**Tasks:**

- [ ] Check all links (internal and external)
- [ ] Verify all code examples are correct
- [ ] Verify all commands are up to date
- [ ] Check for typos and grammar errors
- [ ] Ensure consistent terminology
- [ ] Verify all image paths resolve
- [ ] Test all interactive elements

### 🌍 **Priority 6: Internationalization (Future)**

**Tasks:**

- [ ] Set up i18n infrastructure
  - [ ] Install `@inlang/paraglide-sveltekit`
  - [ ] Configure language files
  - [ ] Extract strings to translation files
- [ ] Add language switcher to navigation
- [ ] Translate priority pages:
  - [ ] Homepage
  - [ ] Getting Started
  - [ ] Quick Start
- [ ] Prioritize languages:
  - [ ] Spanish
  - [ ] German
  - [ ] French
  - [ ] Portuguese (Brazil)
- [ ] Create translation contribution guide
- [ ] Set up Crowdin or similar for community translations

### 📝 **Priority 7: Documentation Tooling**

#### **1. Content Management**

**Tasks:**

- [ ] Create mdsvex custom components:
  - [ ] `<Callout>` (info, warning, error, success)
  - [ ] `<Tabs>` for multi-language examples
  - [ ] `<CodeBlock>` with copy button
  - [ ] `<Video>` with thumbnail and controls
- [ ] Add frontmatter validation
- [ ] Create content linting rules
- [ ] Add spell checker integration
- [ ] Create new page template

#### **2. Developer Experience**

**Tasks:**

- [ ] Document local development setup
- [ ] Add commit message linting
- [ ] Add pre-commit hooks for docs
- [ ] Create PR template for docs changes
- [ ] Add docs change checklist
- [ ] Create style guide for docs writers

### 🎨 **Priority 8: Visual Polish**

#### **1. Images & Assets**

**Tasks:**

- [ ] Create favicon set (16x16, 32x32, 180x180, 512x512)
- [ ] Create Open Graph images
- [ ] Add logo variations (light/dark, different sizes)
- [ ] Create promotional graphics for social media
- [ ] Add placeholder images for screenshots
- [ ] Create diagram templates (Mermaid)

#### **2. Design System**

**Tasks:**

- [ ] Document color palette
- [ ] Document typography scale
- [ ] Document spacing scale
- [ ] Document component patterns
- [ ] Create design tokens
- [ ] Ensure dark mode consistency

---

## Technical Architecture Notes

### Why Custom SvelteKit Instead of Statue?

The team chose to build a custom documentation site rather than use Statue SSG:

1. **Brand Cohesion**: Custom design aligns perfectly with Colibri's aesthetic
2. **Feature Flexibility**: Custom features like link previews, advanced search, blog layouts
3. **Performance**: Optimized specifically for Colibri's needs
4. **Learning Curve**: Team already knows SvelteKit well
5. **Polish**: Animated elements and transitions create memorable first impression

### Technical Stack

**Build Tool:** Vite
**Framework:** SvelteKit (Svelte 5)
**Styling:** Tailwind CSS 4
**Markdown:** mdsvex with custom preprocessors
**Search:** Pagefind (static search index)
**Syntax Highlighting:** Shiki (dual theme support)
**Diagrams:** Mermaid
**Deployment:** Cloudflare Pages (static adapter)
**Analytics:** TBD (Plausible/Fathom/Cloudflare)

### Component Architecture

```
src/lib/components/
├── hero/           # Homepage animations (Hummingbird, etc.)
├── glossary/       # Tooltip system for technical terms
├── sections/       # Reusable page sections (Hero, CTA, etc.)
├── content/        # Content wrappers and utilities
├── markdown/       # Custom markdown renderers
├── links/          # Link previews and navigation
├── search/         # Search overlay and components
├── blog/           # Blog-specific components
├── page/           # Page layout components
└── icons/          # Icon components
```

### Build Process

1. **Development**: `pnpm dev` → Vite dev server with HMR
2. **Build**: `pnpm build` → Static site generation
   - Adapter: Static or Cloudflare (via `ADAPTER` env var)
   - Pre-renders all routes at build time
   - Generates sitemap, RSS feed
3. **Post-build**: `pagefind` indexes content for search
4. **Deploy**: Push to Cloudflare Pages

### Performance Considerations

- **Static Generation**: All pages pre-rendered at build time
- **Client-Side Routing**: SvelteKit handles navigation (no full page reloads)
- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: TBD (consider `@sveltejs/enhanced-img`)
- **Font Loading**: Self-hosted fonts with `font-display: swap`

---

## Open Technical Questions

### 1. Component Library Strategy

**Question:** Should we extract components to `@colibri-hq/ui` package?
**Options:**

- Keep docs components separate (current approach)
- Share some components with main app (Button, Card, etc.)
- Create unified design system

**Decision:** TBD - wait until patterns stabilize

### 2. Image Handling

**Question:** How to handle screenshots and images once app is stable?
**Options:**

- Store in `static/` directory (current)
- Use CDN for images
- Optimize at build time with `@sveltejs/enhanced-img`

**Decision:** TBD - depends on image volume

### 3. Versioned Documentation

**Question:** Do we need version switching (v1.x docs, v2.x docs)?
**Considerations:**

- Most users want latest docs
- Breaking changes rare for self-hosted software
- Adds complexity to maintain

**Decision:** Start without versioning, add if needed

### 4. Offline Support

**Question:** Should docs work offline (PWA)?
**Pros:**

- Useful for air-gapped environments
- Better dev experience

**Cons:**

- Adds complexity
- Service worker maintenance

**Decision:** TBD - low priority, consider for v2

### 5. Demo Instance

**Question:** Provide public demo at demo.colibri.app?
**Pros:**

- Try before installing
- Link from docs

**Cons:**

- Maintenance burden
- Potential abuse
- Privacy concerns

**Decision:** TBD - requires security consideration

---

## Original Implementation Plan (ARCHIVED)

The following sections represent the original Statue-based plan and are kept for historical reference:

<details>
<summary>Original Phase 1: Statue Project Setup (NOT IMPLEMENTED)</summary>

_Note: The original plan proposed using Statue SSG for documentation. The team decided to build a custom SvelteKit application instead, which provided more flexibility and better integration with Colibri's design language. The remainder of this plan is preserved for historical reference only._

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
     import { NavigationBar } from 'statue-ssg';

     const navbarItems = [
       { label: 'Getting Started', href: '/getting-started' },
       { label: 'Setup', href: '/setup' },
       { label: 'User Guide', href: '/user-guide' },
       { label: 'CLI', href: '/cli' },
       { label: 'Packages', href: '/packages' },
       { label: 'API', href: '/api' },
       { label: 'Plugins', href: '/plugins' },
     ];
   </script>

   <NavigationBar {navbarItems} activePath={$page.url.pathname} />
   ```

**Reference:** [Statue Components](https://statue.dev/docs/components)

### Phase 3: Home Page and Landing Content

1. Design homepage (`src/routes/+page.svelte`):

   ```svelte
   <script>
     import { Hero, Categories, LatestContent } from 'statue-ssg';
   </script>

   <Hero />

   <Categories
     directories={[
       {
         title: 'Getting Started',
         url: '/getting-started',
         name: 'Quick introduction to Colibri',
       },
       {
         title: 'Setup Guide',
         url: '/setup',
         name: 'Install and configure your instance',
       },
       { title: 'User Guide', url: '/user-guide', name: 'Learn all features' },
       { title: 'CLI Reference', url: '/cli', name: 'Command-line interface' },
       {
         title: 'Package Docs',
         url: '/packages',
         name: 'SDK and library APIs',
       },
     ]}
   />
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

   ````markdown
   ## colibri works add

   Add a new work to the library from a local file.

   ### Usage

   ```bash
   colibri works add <file>
   ```
   ````

   ### Options
   - `--title` - Override extracted title
   - `--author` - Override extracted author
     ...

   ```

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
     {directories}
     legalLinks={[
       { label: 'Privacy', href: '/privacy' },
       { label: 'Terms', href: '/terms' },
     ]}
     {socialLinks}
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

| File                        | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| `site.config.js`            | Site-wide configuration (name, URLs, social) |
| `src/lib/index.css`         | Theme selection                              |
| `src/routes/+layout.svelte` | Navigation and footer                        |
| `src/routes/+page.svelte`   | Homepage                                     |
| `content/`                  | All markdown content                         |
| `static/`                   | Images, favicon, logos                       |

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
import {(NavigationBar, // Top navigation
Hero, // Landing hero section
Categories, // Content category cards
PageHero, // Page title section
ContentHeader, // Article header with metadata
ContentBody, // Rendered markdown content
Footer, // Site footer
Warning, // Callout boxes (info/warning/error/success)
CollapsibleTree)} from "statue-ssg";
```

### Theming

Change theme in `src/lib/index.css`:

```css
/* Available themes: blue, red, orange, green, purple, cyan, pink, black-white */
@import 'statue-ssg/themes/blue.css';
```

Custom theme requires defining 12 CSS variables (see [Statue Theming](https://statue.dev/docs/themes)).

## File Summary

| Location                   | Purpose                        |
| -------------------------- | ------------------------------ |
| `apps/docs/`               | Documentation site root        |
| `apps/docs/site.config.js` | Statue configuration           |
| `apps/docs/src/`           | Svelte routes and components   |
| `apps/docs/content/`       | Markdown documentation         |
| `apps/docs/static/`        | Static assets                  |
| `apps/docs/wrangler.toml`  | Cloudflare Pages config (opt.) |

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

## Open Questions (ARCHIVED - See "Open Questions for Implementation" above)

1. **Versioning**: Do we need documentation versioning for different Colibri releases?
2. **Search**: Use Statue's built-in search or integrate Pagefind/Algolia? _(Decision: Pagefind integrated)_
3. **Internationalization**: Plan for future translations?
4. **Community**: Include community links (Discord, GitHub Discussions) in navigation?
5. **Analytics**: Add privacy-respecting analytics (Plausible, Fathom)?

</details>
