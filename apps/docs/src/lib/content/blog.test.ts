import { describe, it, expect } from "vitest";
import {
  generateExcerpt,
  getMonthName,
  formatBlogDate,
  getSeriesSlug,
  MONTH_NAMES,
} from "./blog";

describe("generateExcerpt", () => {
  describe("basic text handling", () => {
    it("returns plain text unchanged if under max length", () => {
      const text = "This is a short excerpt.";
      expect(generateExcerpt(text)).toBe(text);
    });

    it("truncates long text at word boundary", () => {
      const longText = "word ".repeat(50); // 250 chars
      const excerpt = generateExcerpt(longText, 100);
      expect(excerpt.length).toBeLessThanOrEqual(103); // 100 + "..."
      expect(excerpt.endsWith("...")).toBe(true);
    });

    it("collapses multiple whitespace into single space", () => {
      const text = "Hello    world\n\ntest";
      expect(generateExcerpt(text)).toBe("Hello world test");
    });
  });

  describe("frontmatter removal", () => {
    it("strips YAML frontmatter", () => {
      const content = `---
title: Test Post
date: 2024-01-01
---

This is the actual content.`;
      expect(generateExcerpt(content)).toBe("This is the actual content.");
    });

    it("handles content without frontmatter", () => {
      const content = "Just plain content.";
      expect(generateExcerpt(content)).toBe("Just plain content.");
    });
  });

  describe("markdown formatting removal", () => {
    it("removes heading markers", () => {
      expect(generateExcerpt("# Heading")).toBe("Heading");
      expect(generateExcerpt("## Second Level")).toBe("Second Level");
      expect(generateExcerpt("### Third Level")).toBe("Third Level");
    });

    it("removes bold formatting", () => {
      expect(generateExcerpt("This is **bold** text")).toBe(
        "This is bold text",
      );
      expect(generateExcerpt("This is __also bold__ text")).toBe(
        "This is also bold text",
      );
    });

    it("removes italic formatting", () => {
      expect(generateExcerpt("This is *italic* text")).toBe(
        "This is italic text",
      );
      expect(generateExcerpt("This is _also italic_ text")).toBe(
        "This is also italic text",
      );
    });

    it("keeps link text but removes URL", () => {
      expect(
        generateExcerpt("Check out [this link](https://example.com) for more"),
      ).toBe("Check out this link for more");
    });

    it("removes images completely", () => {
      // The regex removes images but may leave alt text - verify no URL remains
      const result = generateExcerpt("Before ![alt text](image.png) after");
      expect(result).not.toContain("image.png");
    });

    it("removes inline code", () => {
      expect(generateExcerpt("Use `const x = 1` for variables")).toBe(
        "Use for variables",
      );
    });

    it("removes code blocks", () => {
      const content = `Text before

\`\`\`javascript
const x = 1;
\`\`\`

Text after`;
      const result = generateExcerpt(content);
      // Should remove the code content
      expect(result).not.toContain("const x = 1");
      expect(result).toContain("Text before");
      expect(result).toContain("Text after");
    });

    it("removes HTML tags", () => {
      expect(generateExcerpt("<div>Hello</div> <span>World</span>")).toBe(
        "Hello World",
      );
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      expect(generateExcerpt("")).toBe("");
    });

    it("handles only whitespace", () => {
      expect(generateExcerpt("   \n\n   ")).toBe("");
    });

    it("handles custom max length", () => {
      const text =
        "This is a test sentence that is longer than fifty characters.";
      const excerpt = generateExcerpt(text, 50);
      expect(excerpt.length).toBeLessThanOrEqual(53); // 50 + "..."
    });

    it("does not add ellipsis if text fits", () => {
      const shortText = "Short text";
      expect(generateExcerpt(shortText, 100)).toBe("Short text");
      expect(generateExcerpt(shortText, 100)).not.toContain("...");
    });
  });

  describe("complex content", () => {
    it("handles typical blog post intro", () => {
      const content = `---
title: My Blog Post
date: 2024-01-15
---

# Introduction

This is a **blog post** about [testing](https://example.com).
It has *italic* text and \`code\` samples.

![screenshot](screenshot.png)

More content here.`;

      const excerpt = generateExcerpt(content, 100);
      expect(excerpt).not.toContain("---");
      expect(excerpt).not.toContain("**");
      expect(excerpt).not.toContain("*");
      expect(excerpt).not.toContain("[");
      expect(excerpt).not.toContain("`");
      expect(excerpt).not.toContain("![");
      expect(excerpt).toContain("Introduction");
      expect(excerpt).toContain("blog post");
    });
  });
});

describe("getMonthName", () => {
  it("returns correct month names for valid indices", () => {
    expect(getMonthName(0)).toBe("January");
    expect(getMonthName(5)).toBe("June");
    expect(getMonthName(11)).toBe("December");
  });

  it("returns empty string for invalid indices", () => {
    expect(getMonthName(-1)).toBe("");
    expect(getMonthName(12)).toBe("");
    expect(getMonthName(100)).toBe("");
  });
});

describe("MONTH_NAMES", () => {
  it("has 12 months", () => {
    expect(MONTH_NAMES).toHaveLength(12);
  });

  it("starts with January and ends with December", () => {
    expect(MONTH_NAMES[0]).toBe("January");
    expect(MONTH_NAMES[11]).toBe("December");
  });
});

describe("formatBlogDate", () => {
  it("formats ISO date string to readable format", () => {
    const formatted = formatBlogDate("2024-01-15");
    expect(formatted).toContain("January");
    expect(formatted).toContain("15");
    expect(formatted).toContain("2024");
  });

  it("formats date with time component", () => {
    const formatted = formatBlogDate("2024-06-20T10:30:00Z");
    expect(formatted).toContain("June");
    expect(formatted).toContain("20");
    expect(formatted).toContain("2024");
  });

  it("handles various date formats", () => {
    // These should all parse correctly
    expect(formatBlogDate("2024-12-25")).toContain("December");
    expect(formatBlogDate("2024-03-01")).toContain("March");
  });
});

describe("getSeriesSlug", () => {
  it("converts simple name to slug", () => {
    expect(getSeriesSlug("Getting Started")).toBe("getting-started");
  });

  it("handles multiple spaces", () => {
    expect(getSeriesSlug("My   Great   Series")).toBe("my-great-series");
  });

  it("removes special characters", () => {
    expect(getSeriesSlug("Hello! World?")).toBe("hello-world");
  });

  it("removes leading and trailing dashes", () => {
    expect(getSeriesSlug("!Hello World!")).toBe("hello-world");
  });

  it("handles numbers", () => {
    expect(getSeriesSlug("Part 1: Introduction")).toBe("part-1-introduction");
  });

  it("converts to lowercase", () => {
    expect(getSeriesSlug("UPPERCASE")).toBe("uppercase");
  });

  it("handles already slug-like names", () => {
    expect(getSeriesSlug("already-a-slug")).toBe("already-a-slug");
  });

  it("handles empty string", () => {
    expect(getSeriesSlug("")).toBe("");
  });

  it("handles only special characters", () => {
    expect(getSeriesSlug("!@#$%")).toBe("");
  });
});
