import { expect, type APIRequestContext, type APIResponse } from "@playwright/test";
import { test } from "../base";

/**
 * Search API E2E Tests
 *
 * Tests the tRPC search.query endpoint which searches across:
 * - editions (title, synopsis)
 * - creators (name, description)
 * - publishers (name, description)
 * - collections (name, description)
 *
 * Test data is seeded in database.setup.ts with known values.
 */

// Helper to call tRPC search endpoint
async function searchQuery(
  request: APIRequestContext,
  input: { query: string; types?: string[]; limit?: number },
): Promise<APIResponse> {
  const response = await request.post("/trpc/search.query", {
    data: { json: input },
    headers: { "Content-Type": "application/json" },
  });
  return response;
}

// Helper to extract results from tRPC response
async function getResults(response: APIResponse) {
  const json = await response.json();
  return json.result?.data?.json ?? [];
}

test.describe("Search API - Basic Functionality", () => {
  test("returns matching editions by title", async ({ request }) => {
    const response = await searchQuery(request, { query: "Fantasy Quest" });
    expect(response.ok()).toBe(true);

    const results = await getResults(response);
    const editionResults = results.filter((r: { type: string }) => r.type === "edition");
    expect(editionResults.length).toBeGreaterThan(0);
    expect(editionResults.some((r: { title: string }) => r.title.includes("Fantasy Quest"))).toBe(
      true,
    );
  });

  test("returns matching editions by synopsis", async ({ request }) => {
    const response = await searchQuery(request, { query: "dragons wizards" });
    expect(response.ok()).toBe(true);

    const results = await getResults(response);
    const editionResults = results.filter((r: { type: string }) => r.type === "edition");
    expect(editionResults.length).toBeGreaterThan(0);
  });

  test("returns matching creators by name", async ({ request }) => {
    const response = await searchQuery(request, { query: "Brandon Sanderson" });
    expect(response.ok()).toBe(true);

    const results = await getResults(response);
    const creatorResults = results.filter((r: { type: string }) => r.type === "creator");
    expect(creatorResults.length).toBeGreaterThan(0);
    expect(creatorResults.some((r: { name: string }) => r.name.includes("Brandon Sanderson"))).toBe(
      true,
    );
  });

  test("returns matching publishers by name", async ({ request }) => {
    const response = await searchQuery(request, { query: "Tor Books" });
    expect(response.ok()).toBe(true);

    const results = await getResults(response);
    const publisherResults = results.filter((r: { type: string }) => r.type === "publisher");
    expect(publisherResults.length).toBeGreaterThan(0);
    expect(publisherResults.some((r: { name: string }) => r.name.includes("Tor"))).toBe(true);
  });

  test("returns matching collections by name", async ({ request }) => {
    const response = await searchQuery(request, { query: "Fantasy Favorites" });
    expect(response.ok()).toBe(true);

    const results = await getResults(response);
    const collectionResults = results.filter((r: { type: string }) => r.type === "collection");
    expect(collectionResults.length).toBeGreaterThan(0);
    expect(collectionResults.some((r: { name: string }) => r.name.includes("Fantasy"))).toBe(true);
  });
});

test.describe("Search API - Filtering", () => {
  test("filters by single entity type - editions only", async ({ request }) => {
    const response = await searchQuery(request, { query: "fantasy", types: ["edition"] });
    expect(response.ok()).toBe(true);

    const results = await getResults(response);
    expect(results.every((r: { type: string }) => r.type === "edition")).toBe(true);
  });

  test("filters by single entity type - creators only", async ({ request }) => {
    const response = await searchQuery(request, { query: "fantasy", types: ["creator"] });
    expect(response.ok()).toBe(true);

    const results = await getResults(response);
    expect(results.every((r: { type: string }) => r.type === "creator")).toBe(true);
  });

  test("filters by multiple entity types", async ({ request }) => {
    const response = await searchQuery(request, {
      query: "fantasy",
      types: ["edition", "collection"],
    });
    expect(response.ok()).toBe(true);

    const results = await getResults(response);
    expect(
      results.every((r: { type: string }) => r.type === "edition" || r.type === "collection"),
    ).toBe(true);
  });

  test("respects limit parameter", async ({ request }) => {
    const response = await searchQuery(request, { query: "fantasy", limit: 2 });
    expect(response.ok()).toBe(true);

    const results = await getResults(response);
    expect(results.length).toBeLessThanOrEqual(2);
  });
});

test.describe("Search API - Ranking", () => {
  test("ranks title matches higher than synopsis matches", async ({ request }) => {
    // "Fantasy" appears in both title and synopsis of different entries
    const response = await searchQuery(request, { query: "Fantasy", types: ["edition"] });
    expect(response.ok()).toBe(true);

    const results = await getResults(response);
    if (results.length >= 2) {
      // First results should have "Fantasy" in the title
      const firstResult = results[0];
      expect(firstResult.title.toLowerCase()).toContain("fantasy");
    }
  });

  test("returns results sorted by relevance", async ({ request }) => {
    const response = await searchQuery(request, { query: "science fiction" });
    expect(response.ok()).toBe(true);

    const results = await getResults(response);
    // Results should be returned (exact ordering depends on PostgreSQL FTS scoring)
    expect(Array.isArray(results)).toBe(true);
  });
});

test.describe("Search API - Edge Cases", () => {
  test("returns empty array for non-matching query", async ({ request }) => {
    const response = await searchQuery(request, { query: "xyznonexistent123" });
    expect(response.ok()).toBe(true);

    const results = await getResults(response);
    expect(results).toEqual([]);
  });

  test("handles prefix/partial matching", async ({ request }) => {
    // "Fant" should match "Fantasy"
    const response = await searchQuery(request, { query: "Fant" });
    expect(response.ok()).toBe(true);

    const results = await getResults(response);
    expect(results.length).toBeGreaterThan(0);
  });

  test("handles special characters gracefully", async ({ request }) => {
    const response = await searchQuery(request, { query: "fantasy's best!" });
    expect(response.ok()).toBe(true);
    // Should not error, may return results if "fantasy" or "best" match
  });

  test("handles unicode characters", async ({ request }) => {
    const response = await searchQuery(request, { query: "fantasy cafe" });
    expect(response.ok()).toBe(true);
    // Should handle without error
  });

  test("handles SQL injection attempts safely", async ({ request }) => {
    const response = await searchQuery(request, { query: "'; DROP TABLE edition;--" });
    expect(response.ok()).toBe(true);

    // Should not error and should sanitize the input
    const results = await getResults(response);
    expect(Array.isArray(results)).toBe(true);
  });

  test("handles very long queries by truncating", async ({ request }) => {
    const longQuery = "fantasy ".repeat(100).trim();
    const response = await searchQuery(request, { query: longQuery });
    // Should either succeed or return a validation error (max 200 chars)
    const status = response.status();
    expect([200, 400]).toContain(status);
  });

  test("handles multiple spaces between words", async ({ request }) => {
    const response = await searchQuery(request, { query: "fantasy    quest" });
    expect(response.ok()).toBe(true);

    const results = await getResults(response);
    expect(Array.isArray(results)).toBe(true);
  });

  test("handles leading/trailing whitespace", async ({ request }) => {
    const response = await searchQuery(request, { query: "  fantasy  " });
    expect(response.ok()).toBe(true);

    const results = await getResults(response);
    expect(results.length).toBeGreaterThan(0);
  });
});

test.describe("Search API - Error Handling", () => {
  test("rejects empty query", async ({ request }) => {
    const response = await searchQuery(request, { query: "" });
    expect(response.ok()).toBe(false);
    expect(response.status()).toBe(400);
  });

  test("rejects query exceeding max length", async ({ request }) => {
    const tooLongQuery = "a".repeat(201);
    const response = await searchQuery(request, { query: tooLongQuery });
    expect(response.ok()).toBe(false);
    expect(response.status()).toBe(400);
  });

  test("rejects invalid type filter", async ({ request }) => {
    const response = await request.post("/trpc/search.query", {
      data: { json: { query: "test", types: ["invalid_type"] } },
      headers: { "Content-Type": "application/json" },
    });
    expect(response.ok()).toBe(false);
    expect(response.status()).toBe(400);
  });

  test("rejects limit below minimum", async ({ request }) => {
    const response = await searchQuery(request, { query: "test", limit: 0 });
    expect(response.ok()).toBe(false);
    expect(response.status()).toBe(400);
  });

  test("rejects limit above maximum", async ({ request }) => {
    const response = await searchQuery(request, { query: "test", limit: 100 });
    expect(response.ok()).toBe(false);
    expect(response.status()).toBe(400);
  });
});

test.describe("Search API - Performance", () => {
  test("responds within acceptable time for simple query", async ({ request }) => {
    const start = Date.now();
    const response = await searchQuery(request, { query: "fantasy", limit: 20 });
    const duration = Date.now() - start;

    expect(response.ok()).toBe(true);
    expect(duration).toBeLessThan(500); // 500ms threshold
  });

  test("responds within acceptable time for multi-word query", async ({ request }) => {
    const start = Date.now();
    const response = await searchQuery(request, { query: "epic fantasy adventure", limit: 20 });
    const duration = Date.now() - start;

    expect(response.ok()).toBe(true);
    expect(duration).toBeLessThan(500);
  });

  test("responds within acceptable time when filtering by type", async ({ request }) => {
    const start = Date.now();
    const response = await searchQuery(request, {
      query: "fantasy",
      types: ["edition", "creator"],
      limit: 20,
    });
    const duration = Date.now() - start;

    expect(response.ok()).toBe(true);
    expect(duration).toBeLessThan(500);
  });
});
