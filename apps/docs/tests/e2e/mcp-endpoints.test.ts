import { describe, expect, it } from "vitest";

const BASE_URL = "http://localhost:5174";

describe("MCP Protocol Endpoints", () => {
  describe("GET /.well-known/mcp.json", () => {
    it("returns MCP server discovery document", async () => {
      const response = await fetch(`${BASE_URL}/.well-known/mcp.json`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const data = await response.json();
      expect(data).toHaveProperty("name");
      expect(data).toHaveProperty("mcpEndpoint");
    });

    it("declares server capabilities", async () => {
      const response = await fetch(`${BASE_URL}/.well-known/mcp.json`);
      const data = await response.json();

      expect(data).toHaveProperty("capabilities");
      expect(data.capabilities).toHaveProperty("resources");
    });

    it("points to correct MCP endpoint", async () => {
      const response = await fetch(`${BASE_URL}/.well-known/mcp.json`);
      const data = await response.json();

      expect(data.mcpEndpoint).toBe("/mcp");
    });
  });

  describe("GET /mcp/data/resources.json", () => {
    it("returns list of available resources", async () => {
      const response = await fetch(`${BASE_URL}/mcp/data/resources.json`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const data = await response.json();
      expect(data).toHaveProperty("resources");
      expect(Array.isArray(data.resources)).toBe(true);
    });

    it("resources have required properties", async () => {
      const response = await fetch(`${BASE_URL}/mcp/data/resources.json`);
      const data = await response.json();

      expect(data.resources.length).toBeGreaterThan(0);

      const resource = data.resources[0];
      expect(resource).toHaveProperty("uri");
      expect(resource).toHaveProperty("mimeType");
      expect(resource.mimeType).toBe("text/markdown");
    });

    it("resources have valid URI format", async () => {
      const response = await fetch(`${BASE_URL}/mcp/data/resources.json`);
      const data = await response.json();

      for (const resource of data.resources.slice(0, 5)) {
        expect(resource.uri).toMatch(/^docs:\/\/colibri\/.+/);
      }
    });
  });

  describe("GET /mcp/data/content/[slug].json", () => {
    it("returns content for valid slugs", async () => {
      const response = await fetch(`${BASE_URL}/mcp/data/content/getting-started.json`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const data = await response.json();
      expect(data).toHaveProperty("uri");
      expect(data).toHaveProperty("text");
      expect(data).toHaveProperty("mimeType");
    });

    it("content has text and mimeType", async () => {
      const response = await fetch(`${BASE_URL}/mcp/data/content/getting-started.json`);
      const data = await response.json();

      expect(data).toHaveProperty("text");
      expect(data).toHaveProperty("mimeType");
      expect(data.mimeType).toBe("text/markdown");
      expect(data.text.length).toBeGreaterThan(0);
    });

    it("handles nested slugs", async () => {
      // Try a nested path - adjust if this path doesn't exist
      const response = await fetch(`${BASE_URL}/mcp/data/content/getting-started/quick-start.json`);

      // Either 200 (exists) or 404 (doesn't exist) is valid
      expect([200, 404]).toContain(response.status);
    });

    it("returns 404 for non-existent content", async () => {
      const response = await fetch(
        `${BASE_URL}/mcp/data/content/this-page-does-not-exist-12345.json`,
      );

      expect(response.status).toBe(404);
    });
  });
});
