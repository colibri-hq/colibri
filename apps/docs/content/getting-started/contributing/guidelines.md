---
title: Contributing Guidelines
description: How to contribute to Colibri - code standards, PR process, and community guidelines
date: 2024-01-01
order: 3
tags: [contributing, guidelines, developers, code-review]
relevance: 45
---

# Contributing Guidelines

Thank you for considering contributing to Colibri! This document outlines our standards, processes, and best practices to help you contribute effectively.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. By participating, you agree to:

- Be respectful and considerate in all interactions
- Provide constructive feedback
- Accept constructive criticism gracefully
- Focus on what's best for the community and project
- Show empathy towards other community members

Report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

Before contributing, ensure you have:

1. Read the [Development Setup](/getting-started/contributing/development) guide
2. Set up your local development environment
3. Familiarized yourself with the [Architecture](/getting-started/contributing/architecture)
4. Read through this guide completely

### Finding Work

**Good First Issues**

Look for issues labeled [`good first issue`](https://github.com/colibri-hq/colibri/labels/good%20first%20issue) - these are beginner-friendly and well-defined.

**Help Wanted**

Issues labeled [`help wanted`](https://github.com/colibri-hq/colibri/labels/help%20wanted) are priorities where we'd appreciate community help.

**Feature Requests**

Check [`feature request`](https://github.com/colibri-hq/colibri/labels/feature%20request) issues for ideas. Always discuss in the issue before starting work to ensure alignment.

**Bug Reports**

[`bug`](https://github.com/colibri-hq/colibri/labels/bug) issues are always welcome! If you can reproduce and fix a bug, please do.

## Contribution Workflow

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/colibri.git
cd colibri

# Add upstream remote
git remote add upstream https://github.com/colibri-hq/colibri.git
```

### 2. Create a Branch

Use descriptive branch names:

```bash
# For features
git checkout -b feature/add-book-ratings

# For bug fixes
git checkout -b fix/upload-modal-crash

# For documentation
git checkout -b docs/improve-setup-guide

# For refactoring
git checkout -b refactor/simplify-metadata-aggregator
```

**Branch naming conventions:**

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

### 3. Make Your Changes

Follow these principles:

**Write Clean Code**

- Keep functions small and focused
- Use descriptive variable and function names
- Add comments for complex logic
- Follow existing patterns in the codebase

**Maintain Type Safety**

- Add types for all function parameters and returns
- Avoid `any` types - use `unknown` and type guards
- Keep TypeScript strict mode enabled

**Test Your Changes**

- Write unit tests for new utilities
- Add integration tests for SDK resources
- Write E2E tests for user-facing features
- Ensure all tests pass before committing

**Keep Commits Atomic**

- One logical change per commit
- Commit often with clear messages
- Don't mix unrelated changes

### 4. Follow Code Standards

#### TypeScript Style

```typescript
// ✓ Good: Explicit types, clear naming
async function fetchWorkById(id: string): Promise<Work | null> {
  const result = await db
    .selectFrom("works")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();

  return result ? new Work(result) : null;
}

// ✗ Avoid: Implicit types, unclear naming
async function get(x: string) {
  const r = await db
    .selectFrom("works")
    .selectAll()
    .where("id", "=", x)
    .executeTakeFirst();
  return r ? new Work(r) : null;
}
```

#### Svelte Component Style

```svelte
<script lang="ts">
  // ✓ Good: Props interface, clear state management
  import type { Work } from '@colibri-hq/sdk';

  interface Props {
    work: Work;
    onSave?: (work: Work) => void;
  }

  let { work, onSave }: Props = $props();
  let isEditing = $state(false);
  let isDirty = $derived(/* ... */);

  async function handleSave() {
    if (!isDirty) return;
    await work.update(/* ... */);
    onSave?.(work);
  }
</script>

<!-- Clear, semantic HTML with Tailwind -->
<article class="rounded-lg border border-gray-200 p-4">
  <h2 class="text-xl font-semibold">{work.title}</h2>
  <button onclick={handleSave} disabled={!isDirty}>
    Save Changes
  </button>
</article>
```

#### Database Queries

```typescript
// ✓ Good: Explicit column selection, typed result
interface WorkSummary {
  id: string;
  title: string;
  author_count: number;
}

const works = await db
  .selectFrom("works")
  .select(["id", "title"])
  .select((eb) => [eb.fn.count("contributions.creator_id").as("author_count")])
  .leftJoin("contributions", "works.id", "contributions.work_id")
  .groupBy("works.id")
  .execute();

// ✗ Avoid: Select all, no types
const works = await db.selectFrom("works").selectAll().execute();
```

### 5. Write Good Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

**Examples:**

```bash
# Simple feature
feat(upload): add drag-and-drop support for multiple files

# Bug fix with scope
fix(metadata): handle missing ISBN in Open Library responses

# Breaking change
feat(auth)!: migrate to WebAuthn Level 3 API

BREAKING CHANGE: Passkeys created with older versions will need to be re-registered.

# Documentation
docs(contributing): add section on commit message format

# Multiple changes (avoid if possible)
feat(works): add series support

- Add series table and relationships
- Update work creation to accept series
- Add series UI components
```

**Commit message guidelines:**

- Use imperative mood ("add feature" not "added feature")
- Keep subject line under 72 characters
- Capitalize subject line
- No period at the end of subject
- Separate subject from body with blank line
- Explain _what_ and _why_ in body, not _how_

### 6. Test Your Changes

Before pushing, run all checks locally:

```bash
# Type checking
pnpm check

# Linting
pnpm lint

# Formatting
pnpm fmt

# All tests
pnpm test

# Or run checks for specific package
cd packages/sdk
pnpm test
pnpm lint
pnpm check
```

**Pre-commit hooks** will run automatically via lefthook, but it's better to run these manually during development.

### 7. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create PR on GitHub
```

**Pull Request Guidelines:**

**Title:** Follow same format as commit messages:

- `feat: add book rating system`
- `fix: prevent crash when uploading large PDFs`
- `docs: improve metadata provider documentation`

**Description:** Use this template:

```markdown
## Description

Brief summary of what this PR does and why.

## Changes

- Bullet list of specific changes
- Be concise but clear

## Testing

How did you test this? What scenarios did you cover?

## Screenshots (if applicable)

Before/after screenshots for UI changes

## Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] All checks pass locally
```

**Draft PRs:** Use draft PRs for work-in-progress to get early feedback.

### 8. Code Review Process

**What to expect:**

1. **Automated checks run** - CI will run tests, linting, type checking
2. **Maintainer review** - A maintainer will review your code within a few days
3. **Feedback** - You may receive comments asking for changes
4. **Iteration** - Make requested changes and push new commits
5. **Approval** - Once approved, your PR will be merged

**During review:**

- Be responsive to feedback
- Don't take criticism personally - it's about the code, not you
- Ask questions if you don't understand feedback
- Update PR description if scope changes

**Addressing feedback:**

```bash
# Make changes
git add .
git commit -m "refactor: simplify error handling per review"

# Push to same branch
git push origin feature/your-feature-name
# PR updates automatically
```

**Squashing commits:** We'll typically squash commits when merging, so don't worry about keeping a clean history during iteration.

## Code Standards

### TypeScript Configuration

All packages use strict TypeScript:

- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`

### ESLint Rules

Shared config from `@colibri-hq/shared`:

- Import ordering
- Svelte accessibility rules
- TypeScript best practices
- Unused variable detection

### Prettier Formatting

- Indentation: 2 spaces (not tabs)
- Line width: 120 characters
- Single quotes for strings
- Trailing commas: ES5
- Semicolons: yes

Prettier runs automatically on commit via lefthook.

### File Organization

```
component-name/
├── ComponentName.svelte
├── ComponentName.test.ts
├── ComponentName.stories.svelte  (if UI component)
├── helper-utilities.ts
├── types.ts
└── index.ts  (exports)
```

## Testing Standards

### Test Coverage

We aim for:

- **SDK**: 80%+ coverage on core resources
- **Utilities**: 90%+ coverage
- **Metadata providers**: 70%+ coverage
- **UI components**: Test critical interactions

### Writing Good Tests

**Unit Tests (Vitest):**

```typescript
import { describe, it, expect } from "vitest";

describe("normalizeISBN", () => {
  it("removes hyphens from ISBN-13", () => {
    const result = normalizeISBN("978-0-14-028329-7");
    expect(result).toBe("9780140283297");
  });

  it("returns null for invalid ISBNs", () => {
    const result = normalizeISBN("invalid");
    expect(result).toBeNull();
  });

  it("handles ISBN-10 format", () => {
    const result = normalizeISBN("0-14-028329-4");
    expect(result).toBe("0140283294");
  });
});
```

**Integration Tests:**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../database";
import { Work } from "./work";

describe("Work resource", () => {
  beforeEach(async () => {
    await db.deleteFrom("works").execute();
  });

  it("creates a work with metadata", async () => {
    const work = await Work.create({
      title: "The Great Gatsby",
      subtitle: "A Novel",
      language: "en",
    });

    expect(work.id).toBeDefined();
    expect(work.title).toBe("The Great Gatsby");
  });
});
```

**E2E Tests (Playwright):**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Book Upload", () => {
  test("user can upload and edit book metadata", async ({ page }) => {
    await page.goto("/");

    // Upload
    await page.click("text=Upload");
    await page.setInputFiles("input[type=file]", "test-fixtures/book.epub");

    // Wait for processing
    await expect(page.locator("text=Upload complete")).toBeVisible();

    // Edit metadata
    await page.click("text=Edit");
    await page.fill("input[name=title]", "Updated Title");
    await page.click('button:has-text("Save")');

    // Verify
    await expect(page.locator('h1:has-text("Updated Title")')).toBeVisible();
  });
});
```

### Test Best Practices

- **One assertion per test** when possible
- **Descriptive test names** that explain the scenario
- **Arrange-Act-Assert pattern**
- **Test edge cases** and error conditions
- **Mock external services** (APIs, storage, etc.)
- **Use test fixtures** for consistent data

## Documentation Standards

### Code Comments

````typescript
/**
 * Normalizes an ISBN by removing hyphens and validating format.
 *
 * @param isbn - ISBN string in ISBN-10 or ISBN-13 format
 * @returns Normalized ISBN without hyphens, or null if invalid
 *
 * @example
 * ```typescript
 * normalizeISBN('978-0-14-028329-7') // '9780140283297'
 * normalizeISBN('invalid') // null
 * ```
 */
export function normalizeISBN(isbn: string): string | null {
  // Implementation
}
````

### README Files

Every package should have a README with:

- Brief description
- Installation instructions
- Usage examples
- API reference (or link to docs)

### User-Facing Documentation

When adding features, update relevant docs in `apps/docs/content/`:

- User guide for new features
- API reference for new endpoints
- Architecture docs for significant changes

## Specialized Contributions

### Adding a Metadata Provider

1. Create file: `packages/sdk/src/metadata/providers/your-provider.ts`
2. Implement `MetadataProvider` interface
3. Add tests: `your-provider.test.ts`
4. Register provider in `index.ts`
5. Document in `apps/docs/content/packages/sdk/metadata.md`

See the metadata-expert agent in `.claude/agents/` for guidance.

### Adding a CLI Command

1. Create file: `apps/cli/src/commands/topic/command.ts`
2. Extend `Command` base class
3. Add tests: `apps/cli/test/commands/topic/command.test.ts`
4. Document in `apps/docs/content/cli/`

See the cli-expert agent in `.claude/agents/` for guidance.

### Adding a UI Component

1. Create component: `packages/ui/src/lib/ui/ComponentName/`
2. Write component: `ComponentName.svelte`
3. Add stories: `ComponentName.stories.svelte`
4. Export in `index.ts`
5. Test in Storybook

See the ui-components-expert agent in `.claude/agents/` for guidance.

### Database Schema Changes

1. Create migration: `pnpx supabase migration new feature_name`
2. Write SQL in `supabase/migrations/`
3. Test locally: `pnpx supabase db reset`
4. Generate types: `cd packages/sdk && pnpm types`
5. Update resource classes if needed
6. Document in `supabase/schemas/` if adding new table

See the database-expert agent in `.claude/agents/` for guidance.

## Reporting Bugs

### Before Submitting

1. **Search existing issues** - Your bug may already be reported
2. **Update to latest version** - Bug may already be fixed
3. **Check documentation** - Ensure it's not expected behavior
4. **Reproduce consistently** - Can you trigger it reliably?

### Bug Report Template

```markdown
## Description

Clear description of what the bug is.

## Steps to Reproduce

1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior

What should happen?

## Actual Behavior

What actually happened?

## Environment

- OS: [e.g. macOS 13.0]
- Browser: [e.g. Chrome 120]
- Colibri version: [e.g. 0.3.0]
- Node.js version: [e.g. 18.17.0]

## Additional Context

- Screenshots
- Error logs
- Related issues
```

## Requesting Features

### Before Requesting

1. **Search existing requests** - May already be requested
2. **Check roadmap** - May already be planned
3. **Consider scope** - Does it fit Colibri's goals?

### Feature Request Template

```markdown
## Problem

What problem does this solve?

## Proposed Solution

How would you solve it?

## Alternatives Considered

What other approaches did you consider?

## Use Case

Who would use this? When? Why?

## Implementation Notes

Any technical considerations?
```

## Community

### Communication Channels

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas, general discussion
- **Pull Requests**: Code review, implementation discussion

### Getting Help

**For contributors:**

- Read [Development Setup](/getting-started/contributing/development)
- Check [Architecture Guide](/getting-started/contributing/architecture)
- Reference specialized agents in `.claude/agents/`
- Ask in GitHub Discussions

**For users:**

- Check [User Guide](/user-guide/library-management)
- See [Troubleshooting](/setup/troubleshooting)
- Search GitHub Issues
- Ask in GitHub Discussions

## Recognition

Contributors are recognized in:

- GitHub contributors graph
- Release notes
- Project README

Significant contributions may lead to:

- Maintainer status
- Decision-making involvement
- Early access to new features

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (GNU AGPL v3).

All contributions must be your original work or properly attributed. Do not submit code you don't have the right to license.

## Questions?

Don't hesitate to ask questions:

- Comment on relevant issues
- Start a GitHub Discussion
- Ask in your PR

We're here to help you contribute successfully!

## Thank You!

Every contribution, no matter how small, makes Colibri better. We appreciate your time and effort in improving the project.

**Happy contributing!**
