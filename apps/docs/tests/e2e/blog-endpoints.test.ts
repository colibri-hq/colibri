import { describe, expect, it } from "vitest";

const BASE_URL = "http://localhost:5174";

describe("Blog Endpoints", () => {
  describe("GET /blog", () => {
    it("returns HTML blog listing", async () => {
      const response = await fetch(`${BASE_URL}/blog`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");

      const body = await response.text();
      expect(body.toLowerCase()).toContain("<!doctype html>");
    });
  });

  describe("GET /blog.json", () => {
    it("returns blog posts as JSON", async () => {
      const response = await fetch(`${BASE_URL}/blog.json`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const data = await response.json();
      expect(data).toHaveProperty("posts");
      expect(Array.isArray(data.posts)).toBe(true);
    });

    it("posts have required metadata fields", async () => {
      const response = await fetch(`${BASE_URL}/blog.json`);
      const data = await response.json();

      if (data.posts.length > 0) {
        const post = data.posts[0];
        expect(post).toHaveProperty("slug");
        expect(post).toHaveProperty("title");
        expect(post).toHaveProperty("date");
      }
    });
  });

  describe("GET /blog/archive", () => {
    it("returns archive listing page", async () => {
      const response = await fetch(`${BASE_URL}/blog/archive`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
    });
  });

  describe("GET /blog/archive.json", () => {
    it("returns archive data as JSON", async () => {
      const response = await fetch(`${BASE_URL}/blog/archive.json`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const data = await response.json();
      expect(data).toHaveProperty("years");
    });
  });

  describe("GET /blog/tag", () => {
    it("returns tag listing page", async () => {
      const response = await fetch(`${BASE_URL}/blog/tag`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
    });
  });

  describe("GET /blog/tag.json", () => {
    it("returns tags with counts as JSON", async () => {
      const response = await fetch(`${BASE_URL}/blog/tag.json`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const data = await response.json();
      expect(data).toHaveProperty("tags");
      expect(Array.isArray(data.tags)).toBe(true);
    });

    it("tags have name and count", async () => {
      const response = await fetch(`${BASE_URL}/blog/tag.json`);
      const data = await response.json();

      if (data.tags.length > 0) {
        const tag = data.tags[0];
        expect(tag).toHaveProperty("name");
        expect(tag).toHaveProperty("count");
        expect(typeof tag.count).toBe("number");
      }
    });
  });

  describe("GET /blog/author", () => {
    it("returns author listing page", async () => {
      const response = await fetch(`${BASE_URL}/blog/author`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
    });
  });

  describe("GET /blog/author.json", () => {
    it("returns authors as JSON", async () => {
      const response = await fetch(`${BASE_URL}/blog/author.json`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const data = await response.json();
      expect(data).toHaveProperty("authors");
      expect(Array.isArray(data.authors)).toBe(true);
    });
  });

  describe("GET /blog/series", () => {
    it("returns series listing page", async () => {
      const response = await fetch(`${BASE_URL}/blog/series`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
    });
  });

  describe("GET /blog/series.json", () => {
    it("returns series as JSON", async () => {
      const response = await fetch(`${BASE_URL}/blog/series.json`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const data = await response.json();
      expect(data).toHaveProperty("series");
      expect(Array.isArray(data.series)).toBe(true);
    });
  });

  describe("GET /blog/feed.xml", () => {
    it("returns valid RSS feed", async () => {
      const response = await fetch(`${BASE_URL}/blog/feed.xml`);

      expect(response.status).toBe(200);
      const contentType = response.headers.get("content-type");
      expect(
        contentType?.includes("application/xml") || contentType?.includes("application/rss+xml"),
      ).toBe(true);

      const body = await response.text();
      expect(body).toContain("<rss");
      expect(body).toContain("<channel>");
    });

    it("contains item elements for blog posts", async () => {
      const response = await fetch(`${BASE_URL}/blog/feed.xml`);
      const body = await response.text();

      // If there are blog posts, there should be items
      // Note: This might fail if no blog posts exist
      if (body.includes("<item>")) {
        expect(body).toContain("<title>");
        expect(body).toContain("<link>");
        expect(body).toContain("<pubDate>");
      }
    });
  });

  describe("GET /blog/[slug].json", () => {
    it("returns 404 for non-existent post", async () => {
      const response = await fetch(`${BASE_URL}/blog/this-post-does-not-exist-12345.json`);

      expect(response.status).toBe(404);
    });
  });

  describe("GET /blog/[slug].md", () => {
    it("returns 404 for non-existent post", async () => {
      const response = await fetch(`${BASE_URL}/blog/this-post-does-not-exist-12345.md`);

      expect(response.status).toBe(404);
    });
  });

  describe("Dynamic blog endpoints", () => {
    it("GET /blog/[slug].json returns post data when post exists", async () => {
      // First get the list of posts
      const listResponse = await fetch(`${BASE_URL}/blog.json`);
      const { posts } = await listResponse.json();

      if (posts.length > 0) {
        const urlSlug = posts[0].urlSlug || posts[0].slug.replace("/blog/", "");
        const response = await fetch(`${BASE_URL}/blog/${urlSlug}.json`);

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain("application/json");

        const data = await response.json();
        expect(data).toHaveProperty("type", "blog");
        expect(data).toHaveProperty("content");
        expect(data).toHaveProperty("metadata");
      }
    });

    it("GET /blog/[slug].md returns raw markdown when post exists", async () => {
      const listResponse = await fetch(`${BASE_URL}/blog.json`);
      const { posts } = await listResponse.json();

      if (posts.length > 0) {
        const urlSlug = posts[0].urlSlug || posts[0].slug.replace("/blog/", "");
        const response = await fetch(`${BASE_URL}/blog/${urlSlug}.md`);

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain("text/markdown");

        const body = await response.text();
        // Should start with frontmatter or markdown content
        expect(body.length).toBeGreaterThan(0);
      }
    });
  });
});
