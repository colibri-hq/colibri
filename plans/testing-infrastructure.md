# Testing Infrastructure

## Description

Establish comprehensive testing patterns, coverage goals, and CI/CD integration for the entire monorepo. While tests
exist (452 test files), there's no unified strategy, coverage reporting, or E2E test patterns.

## Current Implementation Status

**Completed:**

- ✅ Vitest configured for SDK, CLI, shared packages
- ✅ Playwright configured for web app
- ✅ 452+ test files exist across packages
- ✅ Test commands in package.json
- ✅ SDK search unit tests (25 tests in `packages/sdk/src/resources/search.test.ts`)
- ✅ E2E API tests pattern established (`apps/app/tests/app/search.spec.ts` - 25 tests)
- ✅ Test database setup/teardown pattern (`apps/app/tests/database.setup.ts`, `database.teardown.ts`)
- ✅ Playwright test fixtures with database access (`apps/app/tests/base.ts`)
- ✅ Performance assertions in E2E tests (response time < 500ms)
- ✅ Coverage reporting with v8 provider and thresholds
- ✅ GitHub Actions CI workflow (`.github/workflows/test.yml`)
- ✅ Codecov integration for coverage tracking

**Not Complete:**

- ❌ No visual regression testing
- ❌ No dedicated load testing (k6/Artillery)

## Implementation Plan

### Phase 1: Coverage Reporting ✅ COMPLETED

1. Coverage configs created for all packages:
   - `packages/sdk/vitest.config.ts` - 60% thresholds
   - `packages/shared/vitest.config.ts` - 80% thresholds
   - `packages/metadata-reconciliation/vitest.config.ts` - 60% thresholds

2. Coverage scripts added:
   - `pnpm test:coverage` - runs coverage across all packages via Turbo
   - `pnpm test:e2e` - runs Playwright E2E tests

3. Turbo task configuration in `turbo.json` for `test:coverage`

### Phase 2: Test Categories ✅ COMPLETED

Test structure established:
```
packages/sdk/src/
├── **/*.test.ts           # Unit tests (colocated with source)

apps/app/tests/
├── base.ts                # Shared test fixtures
├── database.setup.ts      # Test data seeding
├── database.teardown.ts   # Test data cleanup
├── auth/                  # Auth-related tests
└── app/                   # API E2E tests
    └── search.spec.ts     # Search API tests
```

Naming conventions:
- `*.test.ts` - Unit tests (Vitest)
- `*.spec.ts` - E2E/integration tests (Playwright)

### Phase 3: Unit Test Patterns ✅ COMPLETED

Example: SDK resource function testing (`packages/sdk/src/resources/search.test.ts`):
```typescript
import { describe, it, expect } from "vitest";
import { toTsQuery } from "./search";

describe("toTsQuery", () => {
  describe("basic functionality", () => {
    it("converts single word to prefix search", () => {
      expect(toTsQuery("hello")).toBe("hello:*");
    });

    it("converts multiple words to AND prefix search", () => {
      expect(toTsQuery("hello world")).toBe("hello:* & world:*");
    });
  });

  describe("edge cases", () => {
    it("handles SQL injection attempts", () => {
      expect(toTsQuery("'; DROP TABLE users;--")).toBe("DROP:* & TABLE:* & users:*");
    });
  });
});
```

### Phase 4: Integration Test Patterns ✅ COMPLETED

Database test fixtures (`apps/app/tests/base.ts`):
```typescript
import { type Database, initialize } from "@colibri-hq/sdk";
import { test as base } from "@playwright/test";

export const test = base.extend<{ database: Database }>({
  async database(_context, use) {
    const database = initialize(process.env.DATABASE_URL!, {
      certificate: process.env.DATABASE_CERTIFICATE!,
    });
    await use(database);
  },
});
```

Test data seeding (`apps/app/tests/database.setup.ts`):
```typescript
// Export test IDs for cleanup
export const TEST_WORK_IDS = ["900", "901", "902"];
export const TEST_CREATOR_IDS = ["910", "911"];

setup("Seed the database", async () => {
  await database.transaction().execute(async (trx) => {
    // Insert test data with onConflict for idempotency
    await trx.insertInto("creator").values({
      id: BigInt(TEST_CREATOR_IDS[0]),
      name: "Brandon Sanderson",
    }).onConflict((c) => c.column("id").doUpdateSet({ updated_at: new Date() }))
    .execute();
  });
});
```

### Phase 5: E2E Test Strategy ✅ COMPLETED

E2E API test pattern (`apps/app/tests/app/search.spec.ts`):
```typescript
import { expect, type APIRequestContext } from "@playwright/test";
import { test } from "../base";

// Helper to call tRPC endpoint
async function searchQuery(request: APIRequestContext, input: { query: string }) {
  return request.post("/trpc/search.query", {
    data: { json: input },
    headers: { "Content-Type": "application/json" },
  });
}

test.describe("Search API - Basic Functionality", () => {
  test("returns matching editions by title", async ({ request }) => {
    const response = await searchQuery(request, { query: "Fantasy Quest" });
    expect(response.ok()).toBe(true);

    const json = await response.json();
    const results = json.result?.data?.json ?? [];
    expect(results.length).toBeGreaterThan(0);
  });
});

test.describe("Search API - Performance", () => {
  test("responds within acceptable time", async ({ request }) => {
    const start = Date.now();
    await searchQuery(request, { query: "fantasy", limit: 20 });
    expect(Date.now() - start).toBeLessThan(500);
  });
});
```

Test categories implemented:
- Basic functionality (title, synopsis, entity type searches)
- Filtering (type filters, limit)
- Ranking (relevance ordering)
- Edge cases (empty results, special characters, SQL injection)
- Error handling (validation errors)
- Performance (response time thresholds)

### Phase 6: CI/CD Integration ✅ COMPLETED

GitHub Actions workflow created (`.github/workflows/test.yml`):

```yaml
name: Test

on:
  push:
    branches: [main, v3, next]
  pull_request:
    branches: [main, v3, next]

jobs:
  lint:
    # ESLint and Prettier checks

  unit-tests:
    # Vitest with coverage, Codecov upload

  e2e-tests:
    services:
      postgres:
        image: supabase/postgres:15.6.1.143
    # Playwright E2E tests against real database

  typecheck:
    # TypeScript type checking
```

Required checks configured:
- ✅ Lint (ESLint + Prettier)
- ✅ Unit tests with coverage
- ✅ E2E tests with PostgreSQL service
- ✅ Type checking
- ✅ Codecov integration

### Phase 7: Performance Testing

1. Load testing with k6 or Artillery:
   ```javascript
   // k6 script
   export default function () {
     http.get('http://localhost:3000/api/works');
     sleep(1);
   }
   ```

2. Performance budgets:
    - API response time < 200ms
    - Page load < 3s
    - Bundle size limits

### Phase 8: Visual Regression

1. Playwright visual comparisons:
   ```typescript
   test('book card matches snapshot', async ({ page }) => {
     await page.goto('/works');
     await expect(page.locator('.book-card').first()).toHaveScreenshot();
   });
   ```

2. Storybook visual tests with Chromatic (optional)

## Coverage Goals

| Package | Target |
|---------|--------|
| SDK     | 80%    |
| Shared  | 90%    |
| OAuth   | 85%    |
| CLI     | 70%    |
| Web App | 60%    |
| UI      | 70%    |

## Test Commands

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e

# Run specific package
pnpm --filter @colibri-hq/sdk test
```

## Decisions Made

1. **Coverage Tool**: ✅ v8 (native Node.js coverage, fastest)
2. **CI Provider**: ✅ GitHub Actions
3. **E2E Frequency**: ✅ Every PR and push to main branches
4. **Test Database**: ✅ PostgreSQL Docker container in CI, local Supabase for development
5. **Test Data**: ✅ Fixtures with explicit IDs, exported for cleanup

## Open Questions

1. **Visual Testing**: Worth the maintenance cost for UI components?
2. **Performance**: Regular load testing or on-demand?
3. **Flaky Tests**: Strategy for handling retries?
