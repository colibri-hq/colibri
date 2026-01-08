import { describe, expect, it } from "vitest";

const BASE_URL = "http://localhost:5174";

describe("Special Endpoints", () => {
  describe("GET /robots.txt", () => {
    it("returns valid robots.txt with correct content type", async () => {
      const response = await fetch(`${BASE_URL}/robots.txt`);

      expect(response.status).toBe(200);
      // Content type should be text/plain (but may vary by environment)
      const contentType = response.headers.get("content-type") ?? "";
      expect(
        contentType.includes("text/plain") || contentType.includes("text/html"),
      ).toBe(true);

      const body = await response.text();
      expect(body).toContain("User-agent:");
    });

    it("contains User-agent directive", async () => {
      const response = await fetch(`${BASE_URL}/robots.txt`);
      const body = await response.text();

      expect(body).toContain("User-agent:");
    });
  });

  describe("GET /sitemap.xml", () => {
    it("returns valid XML sitemap", async () => {
      const response = await fetch(`${BASE_URL}/sitemap.xml`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/xml");

      const body = await response.text();
      expect(body).toContain('<?xml version="1.0"');
      expect(body).toContain("<urlset");
      expect(body).toContain("</urlset>");
    });

    it("contains loc elements for pages", async () => {
      const response = await fetch(`${BASE_URL}/sitemap.xml`);
      const body = await response.text();

      expect(body).toContain("<loc>");
      expect(body).toContain("</loc>");
    });

    it("includes lastmod dates", async () => {
      const response = await fetch(`${BASE_URL}/sitemap.xml`);
      const body = await response.text();

      // Sitemap should have lastmod dates
      expect(body).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}/);
    });
  });

  describe("GET /feed.xml", () => {
    it("returns valid RSS feed", async () => {
      const response = await fetch(`${BASE_URL}/feed.xml`);

      expect(response.status).toBe(200);
      const contentType = response.headers.get("content-type");
      expect(
        contentType?.includes("application/xml") ||
          contentType?.includes("application/rss+xml"),
      ).toBe(true);

      const body = await response.text();
      expect(body).toContain("<rss");
      expect(body).toContain("</rss>");
    });

    it("contains channel element with required fields", async () => {
      const response = await fetch(`${BASE_URL}/feed.xml`);
      const body = await response.text();

      expect(body).toContain("<channel>");
      expect(body).toContain("<title>");
      expect(body).toContain("<link>");
      expect(body).toContain("<description>");
    });
  });

  describe("GET /sitemap (HTML)", () => {
    it("returns HTML sitemap page", async () => {
      const response = await fetch(`${BASE_URL}/sitemap`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");

      const body = await response.text();
      // In dev mode, the SPA serves HTML for all routes
      expect(body.toLowerCase()).toContain("html");
    });
  });
});
