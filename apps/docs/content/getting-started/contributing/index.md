---
title: Contributing to Colibri
description: Welcome to the Colibri contributor community
date: 2024-01-01
order: 0
tags: [contributing, developers, open-source, guide]
relevance: 60
---

# Contributing to Colibri

Thank you for your interest in contributing to Colibri! We're building a self-hosted ebook library that respects privacy, embraces open standards, and prioritizes user experience. Every contribution helps make this vision a reality.

## Why Contribute?

Colibri is more than just software - it's a community effort to create tools that:

- **Respect user freedom** - Open source, self-hostable, no vendor lock-in
- **Protect privacy** - Your books, your data, on your server
- **Enable knowledge sharing** - Build a personal library and share with family and friends
- **Support open standards** - EPUB, OPDS, OAuth, and more

By contributing, you're helping create software that aligns with these values.

## Ways to Contribute

You don't need to be a developer to contribute! Here are ways you can help:

### Code Contributions

- **Fix bugs** - Help make Colibri more stable
- **Add features** - Implement requested features or propose new ones
- **Improve performance** - Optimize queries, reduce bundle size, speed up processing
- **Write tests** - Increase test coverage and reliability
- **Refactor code** - Improve code quality and maintainability

Start with [Good First Issues](https://github.com/colibri-hq/colibri/labels/good%20first%20issue) if you're new to the project.

### Documentation

- **Improve guides** - Make setup and usage clearer
- **Fix typos** - Small fixes matter!
- **Add examples** - Show how to use features
- **Translate docs** - Help non-English speakers (coming soon)
- **Write tutorials** - Share your knowledge

### Design

- **UI/UX improvements** - Enhance user experience
- **Accessibility** - Make Colibri usable by everyone
- **Visual design** - Icons, graphics, branding
- **User research** - Help us understand user needs

### Testing

- **Report bugs** - Help us find and fix issues
- **Test features** - Try new features before release
- **Browser testing** - Ensure compatibility across browsers
- **Performance testing** - Identify bottlenecks

### Community

- **Answer questions** - Help others in discussions
- **Share your setup** - Blog about your Colibri instance
- **Spread the word** - Tell others about Colibri
- **Provide feedback** - Share your experience and suggestions

## Getting Started

### Quick Links

1. **[Development Setup](/getting-started/contributing/development)** - Set up your local environment
2. **[Architecture Overview](/getting-started/contributing/architecture)** - Understand the codebase structure
3. **[Contributing Guidelines](/getting-started/contributing/guidelines)** - Code standards and PR process

### Step-by-Step for New Contributors

**Step 1: Set up your environment**

Follow the [Development Setup](/getting-started/contributing/development) guide to:

- Install prerequisites (Node.js, pnpm, Docker)
- Fork and clone the repository
- Start local services (PostgreSQL, MinIO)
- Run the development server

**Step 2: Find something to work on**

- Browse [Good First Issues](https://github.com/colibri-hq/colibri/labels/good%20first%20issue)
- Check [Help Wanted](https://github.com/colibri-hq/colibri/labels/help%20wanted) issues
- Read [Feature Requests](https://github.com/colibri-hq/colibri/labels/feature%20request)
- Ask in [Discussions](https://github.com/colibri-hq/colibri/discussions) what needs help

**Step 3: Understand the architecture**

Read the [Architecture Overview](/getting-started/contributing/architecture) to learn:

- Monorepo structure (apps vs packages)
- Tech stack (SvelteKit, Kysely, tRPC)
- Key patterns (type safety, progressive enhancement)
- Data flow (upload, enrichment, authentication)

**Step 4: Make your changes**

Follow the [Contributing Guidelines](/getting-started/contributing/guidelines) for:

- Code standards and style
- Testing requirements
- Commit message format
- Pull request process

**Step 5: Submit your contribution**

- Push to your fork
- Create a pull request
- Respond to code review feedback
- Celebrate when merged!

## Project Structure at a Glance

```
colibri/
├── apps/
│   ├── app/          # Main SvelteKit web application
│   ├── cli/          # Command-line interface (oclif)
│   └── docs/         # Documentation site
├── packages/
│   ├── sdk/          # Core SDK (database, metadata, storage)
│   ├── ui/           # UI component library (Svelte + Storybook)
│   ├── shared/       # Shared utilities and configs
│   ├── mobi/         # MOBI ebook parser
│   ├── pdf/          # PDF utilities wrapper
│   ├── oauth/        # OAuth 2.0 server
│   ├── open-library-client/  # Open Library API client
│   └── languages/    # Language code utilities
└── supabase/
    ├── migrations/   # Database schema migrations
    └── schemas/      # Schema documentation
```

### Key Technologies

- **Frontend**: Svelte 5, SvelteKit, Tailwind CSS 4, tRPC
- **Backend**: Node.js, PostgreSQL (Kysely ORM), tRPC
- **Storage**: S3-compatible (MinIO/AWS/R2)
- **Auth**: Passkeys (WebAuthn)
- **Monorepo**: Turborepo + pnpm workspaces

See [Architecture Overview](/getting-started/contributing/architecture) for detailed information.

## Contribution Areas

### By Skill Level

**Beginner-Friendly:**

- Documentation improvements
- UI polish (styling, layout)
- Writing tests
- Bug fixes with clear reproduction steps

**Intermediate:**

- New UI components
- CLI commands
- Metadata provider improvements
- Database queries and optimizations

**Advanced:**

- Metadata reconciliation algorithms
- Performance optimizations
- Security enhancements
- New storage backends
- OAuth flows

### By Interest Area

**Frontend Development:**

- `apps/app/src/` - Web application
- `packages/ui/` - Component library
- Svelte 5, SvelteKit, Tailwind CSS

**Backend Development:**

- `apps/app/src/lib/trpc/` - API routes
- `packages/sdk/src/resources/` - Domain models
- `supabase/schemas/` - Database schema
- Kysely, PostgreSQL, tRPC

**CLI Development:**

- `apps/cli/src/commands/` - CLI commands
- oclif framework, terminal UI

**Data & Metadata:**

- `packages/sdk/src/metadata/` - Metadata providers
- `packages/sdk/src/ingestion/` - Ingestion pipeline
- External APIs, reconciliation algorithms

**Infrastructure:**

- `packages/oauth/` - OAuth server
- `packages/sdk/src/storage/` - S3 storage
- Docker, deployment, CI/CD

## Specialized Agents

Colibri has AI agents with deep knowledge of specific areas. Reference these when contributing:

| Agent                       | Domain                     | Located in                                  |
| --------------------------- | -------------------------- | ------------------------------------------- |
| **sdk-expert**              | SDK, database, storage     | `.claude/agents/sdk-expert.md`              |
| **web-app-expert**          | SvelteKit, tRPC, auth      | `.claude/agents/web-app-expert.md`          |
| **ui-components-expert**    | UI components, Storybook   | `.claude/agents/ui-components-expert.md`    |
| **cli-expert**              | CLI commands               | `.claude/agents/cli-expert.md`              |
| **database-expert**         | PostgreSQL, migrations     | `.claude/agents/database-expert.md`         |
| **metadata-expert**         | Metadata providers         | `.claude/agents/metadata-expert.md`         |
| **ebook-processing-expert** | EPUB/MOBI/PDF parsing      | `.claude/agents/ebook-processing-expert.md` |
| **infrastructure-expert**   | OAuth, configs, deployment | `.claude/agents/infrastructure-expert.md`   |
| **tech-lead**               | Architecture, planning     | `.claude/agents/tech-lead.md`               |

## Code Standards Overview

We maintain high code quality through:

**Type Safety**

- Strict TypeScript everywhere
- Database types generated from schema
- End-to-end type safety with tRPC

**Testing**

- Unit tests for utilities (Vitest)
- Integration tests for SDK resources (Vitest)
- E2E tests for user flows (Playwright)

**Code Quality**

- ESLint for linting
- Prettier for formatting
- Pre-commit hooks (lefthook)

**Documentation**

- JSDoc comments for public APIs
- README files for packages
- User-facing documentation

See [Contributing Guidelines](/getting-started/contributing/guidelines) for detailed standards.

## Development Workflow

```bash
# 1. Set up environment
corepack enable pnpm
pnpm install
pnpx supabase start
cp .env.example .env
pnpx supabase status --output env >> .env

# 2. Start development
pnpm dev                 # All packages
pnpm dev:app             # Web app only
pnpm dev:cli             # CLI only

# 3. Make changes and test
pnpm check               # Type checking
pnpm lint                # Linting
pnpm fmt                 # Formatting
pnpm test                # All tests

# 4. Commit (pre-commit hooks run automatically)
git add .
git commit -m "feat: add feature description"

# 5. Push and create PR
git push origin feature/your-feature
```

See [Development Setup](/getting-started/contributing/development) for complete instructions.

## Communication

### GitHub Issues

Use for:

- Bug reports
- Feature requests
- Task tracking

### GitHub Discussions

Use for:

- Questions and help
- Ideas and proposals
- General discussion
- Showcasing your instance

### Pull Requests

Use for:

- Code review
- Implementation discussion
- Documenting decisions

## Recognition

We value all contributions! Contributors are recognized through:

- **GitHub contributors graph** - Automatic recognition
- **Release notes** - Significant contributions mentioned
- **Project README** - Key contributors highlighted

Regular contributors may be invited to become maintainers.

## Code of Conduct

We are committed to providing a welcoming environment. Please:

- Be respectful and considerate
- Provide constructive feedback
- Accept criticism gracefully
- Focus on what's best for the community

Report issues to project maintainers.

## License

By contributing, you agree your contributions will be licensed under GNU AGPL v3, the same license as the project.

All contributions must be your original work or properly attributed.

## Next Steps

Ready to contribute? Here's what to do next:

1. **Set up your environment** - [Development Setup](/getting-started/contributing/development)
2. **Explore the codebase** - [Architecture Overview](/getting-started/contributing/architecture)
3. **Pick an issue** - [Good First Issues](https://github.com/colibri-hq/colibri/labels/good%20first%20issue)
4. **Read the guidelines** - [Contributing Guidelines](/getting-started/contributing/guidelines)
5. **Make your first PR** - We're here to help!

## Questions?

Don't hesitate to ask:

- Comment on issues
- Start a discussion
- Ask in your PR
- Reference specialized agents

We want you to succeed!

## Thank You

Thank you for considering contributing to Colibri. Whether you're fixing a typo, adding a feature, or helping other users, your contribution matters.

Together, we're building something valuable that respects users and promotes knowledge sharing.

**Welcome to the Colibri community!**
