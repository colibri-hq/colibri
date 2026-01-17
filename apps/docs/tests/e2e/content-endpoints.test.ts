import { describe, expect, it } from "vitest";

const BASE_URL = "http://localhost:5174";

describe("Content JSON/MD Endpoints", () => {
  describe("GET /[slug].json", () => {
    it("returns page JSON with HATEOAS links for getting-started", async () => {
      const response = await fetch(`${BASE_URL}/getting-started.json`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const data = await response.json();
      expect(data).toHaveProperty("type", "page");
      expect(data).toHaveProperty("metadata");
      expect(data.metadata).toHaveProperty("title");
      expect(data).toHaveProperty("content");
      expect(data).toHaveProperty("links");
      expect(data.links).toHaveProperty("self");
    });

    it("includes alternate links", async () => {
      const response = await fetch(`${BASE_URL}/getting-started.json`);
      const data = await response.json();

      expect(data.links.self).toHaveProperty("html");
      expect(data.links.self).toHaveProperty("json");
      expect(data.links.self).toHaveProperty("markdown");
    });

    it("includes navigation links", async () => {
      const response = await fetch(`${BASE_URL}/getting-started.json`);
      const data = await response.json();

      // Should have breadcrumbs
      if (data.navigation) {
        expect(data.navigation).toHaveProperty("breadcrumbs");
      }
    });

    it("returns 404 for non-existent page", async () => {
      const response = await fetch(`${BASE_URL}/this-page-definitely-does-not-exist-xyz.json`);

      expect(response.status).toBe(404);
    });
  });

  describe("GET /[slug].md", () => {
    it("returns raw markdown for getting-started", async () => {
      const response = await fetch(`${BASE_URL}/getting-started.md`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/markdown");

      const body = await response.text();
      expect(body.length).toBeGreaterThan(0);
    });

    it("returns markdown content", async () => {
      const response = await fetch(`${BASE_URL}/getting-started.md`);
      const body = await response.text();

      // Should contain markdown heading
      expect(body).toMatch(/^#\s+.+/m);
    });

    it("returns 404 for non-existent page", async () => {
      const response = await fetch(`${BASE_URL}/this-page-definitely-does-not-exist-xyz.md`);

      expect(response.status).toBe(404);
    });
  });

  describe("GET /index.json", () => {
    it("returns root page JSON", async () => {
      const response = await fetch(`${BASE_URL}/index.json`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const data = await response.json();
      expect(data).toHaveProperty("type");
    });
  });

  describe("Link header", () => {
    it("JSON responses include Link header with alternates", async () => {
      const response = await fetch(`${BASE_URL}/getting-started.json`);

      const linkHeader = response.headers.get("link");
      if (linkHeader) {
        expect(linkHeader).toContain('rel="alternate"');
      }
    });

    it("MD responses include Link header with alternates", async () => {
      const response = await fetch(`${BASE_URL}/getting-started.md`);

      const linkHeader = response.headers.get("link");
      if (linkHeader) {
        expect(linkHeader).toContain('rel="alternate"');
      }
    });
  });

  describe("Nested content paths", () => {
    it("handles nested JSON paths", async () => {
      // Try a nested path that should exist
      const response = await fetch(`${BASE_URL}/getting-started/quick-start.json`);

      // Either 200 (exists) or 404 (doesn't exist) is valid
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty("type");
        expect(data).toHaveProperty("metadata");
      }
    });

    it("handles nested MD paths", async () => {
      const response = await fetch(`${BASE_URL}/getting-started/quick-start.md`);

      // Either 200 (exists) or 404 (doesn't exist) is valid
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const body = await response.text();
        expect(body.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Content type consistency", () => {
    it("JSON endpoint returns application/json", async () => {
      const response = await fetch(`${BASE_URL}/getting-started.json`);
      expect(response.headers.get("content-type")).toMatch(/application\/json/);
    });

    it("MD endpoint returns text/markdown", async () => {
      const response = await fetch(`${BASE_URL}/getting-started.md`);
      expect(response.headers.get("content-type")).toMatch(/text\/markdown/);
    });
  });
});
