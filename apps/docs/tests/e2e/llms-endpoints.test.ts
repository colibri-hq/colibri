import { describe, expect, it } from "vitest";

const BASE_URL = "http://localhost:5174";

describe("LLMs Discovery Endpoints", () => {
  describe("GET /llms.txt", () => {
    it("returns structured documentation index", async () => {
      const response = await fetch(`${BASE_URL}/llms.txt`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/plain");

      const body = await response.text();
      // Should have a title/header
      expect(body).toMatch(/^#\s+.+/m);
    });

    it("contains section headers", async () => {
      const response = await fetch(`${BASE_URL}/llms.txt`);
      const body = await response.text();

      // Should have markdown section headers
      expect(body).toMatch(/^##\s+.+/m);
    });

    it("contains markdown links to documentation", async () => {
      const response = await fetch(`${BASE_URL}/llms.txt`);
      const body = await response.text();

      // Should have markdown-style links
      expect(body).toMatch(/\[.+\]\(.+\)/);
    });
  });

  describe("GET /llms-full.txt", () => {
    it("returns extended documentation", async () => {
      const response = await fetch(`${BASE_URL}/llms-full.txt`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/plain");

      const body = await response.text();
      expect(body.length).toBeGreaterThan(1000);
    });

    it("is substantially larger than llms.txt", async () => {
      const [llmsResponse, llmsFullResponse] = await Promise.all([
        fetch(`${BASE_URL}/llms.txt`),
        fetch(`${BASE_URL}/llms-full.txt`),
      ]);

      const llmsBody = await llmsResponse.text();
      const llmsFullBody = await llmsFullResponse.text();

      // Full version should be larger
      expect(llmsFullBody.length).toBeGreaterThan(llmsBody.length);
    });

    it("contains actual documentation content", async () => {
      const response = await fetch(`${BASE_URL}/llms-full.txt`);
      const body = await response.text();

      // Should contain actual documentation text, not just links
      expect(body).toMatch(/\w{20,}/); // At least some substantial words
    });
  });
});
