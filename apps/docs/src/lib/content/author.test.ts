import { describe, it, expect } from "vitest";
import {
  parseAuthor,
  getGravatarUrl,
  getAuthorWithGravatar,
  authorNameToSlug,
  slugToAuthorName,
} from "./author";

describe("parseAuthor", () => {
  it("parses author with name and email", () => {
    const result = parseAuthor("John Doe <john@example.com>");
    expect(result).toEqual({ name: "John Doe", email: "john@example.com" });
  });

  it("parses author with name only", () => {
    const result = parseAuthor("John Doe");
    expect(result).toEqual({ name: "John Doe" });
  });

  it("handles extra whitespace in name", () => {
    const result = parseAuthor("  John Doe  ");
    expect(result).toEqual({ name: "John Doe" });
  });

  it("handles extra whitespace around email", () => {
    const result = parseAuthor("John Doe < john@example.com >");
    expect(result).toEqual({ name: "John Doe", email: "john@example.com" });
  });

  it("normalizes email to lowercase", () => {
    const result = parseAuthor("John Doe <John@Example.COM>");
    expect(result).toEqual({ name: "John Doe", email: "john@example.com" });
  });

  it("handles empty string", () => {
    const result = parseAuthor("");
    expect(result).toEqual({ name: "" });
  });

  it("handles name with special characters", () => {
    const result = parseAuthor("José García-López <jose@example.com>");
    expect(result).toEqual({ name: "José García-López", email: "jose@example.com" });
  });

  it("handles unclosed angle bracket as plain name", () => {
    const result = parseAuthor("John Doe <broken");
    expect(result).toEqual({ name: "John Doe <broken" });
  });
});

describe("getGravatarUrl", () => {
  it("returns a valid Gravatar URL", async () => {
    const url = await getGravatarUrl("test@example.com");
    expect(url).toMatch(/^https:\/\/www\.gravatar\.com\/avatar\/[a-f0-9]+/);
    expect(url).toContain("s=80"); // default size
    expect(url).toContain("d=identicon"); // default image type
  });

  it("respects custom size parameter", async () => {
    const url = await getGravatarUrl("test@example.com", 200);
    expect(url).toContain("s=200");
  });

  it("respects custom default image type", async () => {
    const url = await getGravatarUrl("test@example.com", 80, "robohash");
    expect(url).toContain("d=robohash");
  });

  it("normalizes email before hashing", async () => {
    const url1 = await getGravatarUrl("Test@Example.com");
    const url2 = await getGravatarUrl("test@example.com");
    const url3 = await getGravatarUrl("  TEST@EXAMPLE.COM  ");

    // All should produce the same hash
    expect(url1).toBe(url2);
    expect(url2).toBe(url3);
  });

  it("caches results for same email and options", async () => {
    const url1 = await getGravatarUrl("cache-test@example.com", 100, "mp");
    const url2 = await getGravatarUrl("cache-test@example.com", 100, "mp");
    expect(url1).toBe(url2);
  });

  it("produces different URLs for different sizes", async () => {
    const url80 = await getGravatarUrl("size-test@example.com", 80);
    const url200 = await getGravatarUrl("size-test@example.com", 200);
    expect(url80).not.toBe(url200);
    expect(url80).toContain("s=80");
    expect(url200).toContain("s=200");
  });
});

describe("getAuthorWithGravatar", () => {
  it("returns author with gravatar URL when email is present", async () => {
    const result = await getAuthorWithGravatar("John Doe <john@example.com>");
    expect(result.name).toBe("John Doe");
    expect(result.email).toBe("john@example.com");
    expect(result.gravatarUrl).toBeDefined();
    expect(result.gravatarUrl).toMatch(/^https:\/\/www\.gravatar\.com\/avatar\//);
  });

  it("returns author without gravatar URL when no email", async () => {
    const result = await getAuthorWithGravatar("John Doe");
    expect(result.name).toBe("John Doe");
    expect(result.email).toBeUndefined();
    expect(result.gravatarUrl).toBeUndefined();
  });

  it("respects custom size parameter", async () => {
    const result = await getAuthorWithGravatar("John Doe <john@example.com>", 150);
    expect(result.gravatarUrl).toContain("s=150");
  });

  it("caches results for same author string and size", async () => {
    const result1 = await getAuthorWithGravatar("Cache Test <cache@example.com>", 100);
    const result2 = await getAuthorWithGravatar("Cache Test <cache@example.com>", 100);
    expect(result1).toBe(result2); // Same object reference due to caching
  });
});

describe("authorNameToSlug", () => {
  it("converts name to URL-safe slug", () => {
    expect(authorNameToSlug("John Doe")).toBe("john%20doe");
  });

  it("handles names with special characters", () => {
    expect(authorNameToSlug("José García")).toBe("jos%C3%A9%20garc%C3%ADa");
  });

  it("trims whitespace", () => {
    expect(authorNameToSlug("  John Doe  ")).toBe("john%20doe");
  });

  it("converts to lowercase", () => {
    expect(authorNameToSlug("JOHN DOE")).toBe("john%20doe");
  });

  it("handles empty string", () => {
    expect(authorNameToSlug("")).toBe("");
  });
});

describe("slugToAuthorName", () => {
  it("decodes URL-encoded slug back to name", () => {
    expect(slugToAuthorName("john%20doe")).toBe("john doe");
  });

  it("handles special characters", () => {
    expect(slugToAuthorName("jos%C3%A9%20garc%C3%ADa")).toBe("josé garcía");
  });

  it("handles already decoded strings", () => {
    expect(slugToAuthorName("john doe")).toBe("john doe");
  });
});

describe("authorNameToSlug and slugToAuthorName roundtrip", () => {
  const testCases = [
    "John Doe",
    "Jane Smith",
    "José García",
    "François Müller",
    "O'Brien",
    "Mary-Jane Watson",
  ];

  for (const name of testCases) {
    it(`roundtrips "${name}"`, () => {
      const slug = authorNameToSlug(name);
      const decoded = slugToAuthorName(slug);
      // Note: case is lost in the roundtrip since authorNameToSlug lowercases
      expect(decoded).toBe(name.toLowerCase().trim());
    });
  }
});
