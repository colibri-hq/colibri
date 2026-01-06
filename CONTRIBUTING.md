# Contributing to Colibri

Thank you for your interest in contributing to Colibri! We welcome contributions of all kinds - code, documentation, design, bug reports, and more.

## Quick Start

**New to the project?** Follow these steps:

1. **Read the [Contributing Overview](apps/docs/content/contributing/index.md)** - Learn about ways to contribute
2. **Set up your environment** - Follow the [Development Setup](apps/docs/content/contributing/development.md) guide
3. **Understand the architecture** - Read the [Architecture Guide](apps/docs/content/contributing/architecture.md)
4. **Follow the guidelines** - Review [Contributing Guidelines](apps/docs/content/contributing/guidelines.md)
5. **Find an issue** - Check [Good First Issues](https://github.com/colibri-hq/colibri/labels/good%20first%20issue)

## One-Minute Setup

```bash
# Clone and install dependencies
git clone https://github.com/YOUR_USERNAME/colibri.git
cd colibri
corepack enable pnpm
pnpm install

# Start local database
pnpx supabase start

# Configure environment
cp .env.example .env
pnpx supabase status --output env >> .env

# Start development server
pnpm dev
```

Visit http://localhost:5173 to see the application running.

## Documentation

All contribution documentation is in `/apps/docs/content/contributing/`:

- **[Contributing Overview](apps/docs/content/contributing/index.md)** - Start here for ways to contribute
- **[Development Setup](apps/docs/content/contributing/development.md)** - Complete environment setup guide
- **[Architecture Guide](apps/docs/content/contributing/architecture.md)** - Understanding the codebase
- **[Contributing Guidelines](apps/docs/content/contributing/guidelines.md)** - Code standards and PR process

## Quick Reference

### Prerequisites

- **Node.js 18+** - Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm)
- **pnpm 8+** - Enable with `corepack enable pnpm`
- **Docker** - For local PostgreSQL and MinIO
- **Git** - Version control

### Development Commands

```bash
pnpm dev              # Run all packages in dev mode
pnpm dev:app          # Run only the web app
pnpm dev:cli          # Run only the CLI

pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Lint all packages
pnpm fmt              # Format all packages
pnpm check            # TypeScript type checking

pnpm storybook        # Start UI component Storybook
```

### Project Structure

```
colibri/
├── apps/
│   ├── app/          # Main SvelteKit web application
│   ├── cli/          # oclif-based CLI tool
│   └── docs/         # Documentation site
├── packages/
│   ├── sdk/          # Core SDK (database, metadata, storage)
│   ├── ui/           # Svelte component library
│   ├── shared/       # Shared utilities and configs
│   ├── mobi/         # MOBI ebook parser
│   ├── pdf/          # PDF utilities
│   ├── oauth/        # OAuth 2.0 server
│   ├── open-library-client/  # Open Library API client
│   └── languages/    # Language code utilities
└── supabase/
    ├── migrations/   # Database migrations
    └── schemas/      # Schema documentation
```

### Making a Contribution

1. **Fork the repository** on GitHub
2. **Clone your fork** and create a branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following our code standards
4. **Test locally**:
   ```bash
   pnpm check && pnpm lint && pnpm test
   ```
5. **Commit with a descriptive message**:
   ```bash
   git commit -m "feat: add feature description"
   ```
6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Create a Pull Request** on GitHub

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add book rating system
fix: prevent crash when uploading PDFs
docs: improve setup instructions
refactor: simplify metadata aggregator
test: add tests for ISBN normalization
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

## Code Standards

- **TypeScript** - Strict mode, explicit types
- **Svelte 5** - Modern reactive components with runes
- **ESLint + Prettier** - Shared configs from `@colibri-hq/shared`
- **Testing** - Vitest for unit/integration, Playwright for E2E
- **Pre-commit hooks** - Automatic formatting and linting via lefthook

See [Contributing Guidelines](apps/docs/content/contributing/guidelines.md) for detailed standards.

## Getting Help

- **Questions?** Start a [GitHub Discussion](https://github.com/colibri-hq/colibri/discussions)
- **Bug reports?** Open a [GitHub Issue](https://github.com/colibri-hq/colibri/issues)
- **Need guidance?** Reference specialized agents in `.claude/agents/`
- **Want to chat?** Comment on relevant issues or PRs

## Ways to Contribute

You don't need to be a developer! Here are ways to help:

- **Code** - Fix bugs, add features, improve performance
- **Documentation** - Improve guides, fix typos, add examples
- **Design** - UI/UX improvements, accessibility, visual design
- **Testing** - Report bugs, test features, browser compatibility
- **Community** - Answer questions, share your setup, spread the word

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. By participating, you agree to:

- Be respectful and considerate
- Provide constructive feedback
- Accept constructive criticism
- Focus on what's best for the community

## License

By contributing, you agree that your contributions will be licensed under the GNU AGPL v3, the same license as the project.

## Thank You!

Every contribution, no matter how small, makes Colibri better. We appreciate your time and effort in improving the project.

**Happy contributing!**

---

**For comprehensive documentation, see:**
- [Contributing Overview](apps/docs/content/contributing/index.md)
- [Development Setup](apps/docs/content/contributing/development.md)
- [Architecture Guide](apps/docs/content/contributing/architecture.md)
- [Contributing Guidelines](apps/docs/content/contributing/guidelines.md)
