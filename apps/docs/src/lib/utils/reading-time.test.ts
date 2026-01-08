import { describe, expect, it } from "vitest";
import { calculateReadingTime } from "./reading-time";

describe("calculateReadingTime", () => {
  describe("word counting", () => {
    it("returns 1 minute for empty content", () => {
      expect(calculateReadingTime("")).toBe(1);
    });

    it("returns 1 minute for whitespace-only content", () => {
      expect(calculateReadingTime("   \n\n\t  ")).toBe(1);
    });

    it("returns 1 minute for content under 200 words", () => {
      const text = "hello world ".repeat(50); // 100 words
      expect(calculateReadingTime(text)).toBe(1);
    });

    it("returns 1 minute for exactly 200 words", () => {
      const text = "word ".repeat(200);
      expect(calculateReadingTime(text)).toBe(1);
    });

    it("returns 2 minutes for 201-400 words", () => {
      const text = "word ".repeat(250);
      expect(calculateReadingTime(text)).toBe(2);
    });

    it("returns 3 minutes for 401-600 words", () => {
      const text = "word ".repeat(500);
      expect(calculateReadingTime(text)).toBe(3);
    });
  });

  describe("code block stripping", () => {
    it("strips fenced code blocks", () => {
      const markdown = `
Some text here.

\`\`\`javascript
const x = 1;
const y = 2;
const z = 3;
\`\`\`

More text here.
      `;
      // Only counts "Some text here. More text here." = 5 words
      expect(calculateReadingTime(markdown)).toBe(1);
    });

    it("strips multiple fenced code blocks", () => {
      const markdown = `
Text one.

\`\`\`js
code1
\`\`\`

Text two.

\`\`\`python
code2
\`\`\`

Text three.
      `;
      expect(calculateReadingTime(markdown)).toBe(1);
    });

    it("strips inline code", () => {
      const markdown =
        "Use the `calculateReadingTime` function to get `reading` time.";
      // "Use the function to get time." = 6 words
      expect(calculateReadingTime(markdown)).toBe(1);
    });
  });

  describe("link handling", () => {
    it("keeps link text but removes URLs", () => {
      const markdown =
        "Check out [this amazing article](https://example.com/very-long-url-path) for more.";
      // "Check out this amazing article for more." = 7 words
      expect(calculateReadingTime(markdown)).toBe(1);
    });

    it("handles multiple links", () => {
      const markdown =
        "[First](url1) and [Second](url2) and [Third](url3) links.";
      // "First and Second and Third links." = 6 words
      expect(calculateReadingTime(markdown)).toBe(1);
    });
  });

  describe("image removal", () => {
    it("removes image syntax completely", () => {
      const markdown =
        "Here is an image: ![alt text](image.png) and some text.";
      // "Here is an image: and some text." = 7 words
      expect(calculateReadingTime(markdown)).toBe(1);
    });

    it("removes multiple images", () => {
      const markdown =
        "![img1](a.png) Text ![img2](b.png) more text ![img3](c.png)";
      // "Text more text" = 3 words
      expect(calculateReadingTime(markdown)).toBe(1);
    });
  });

  describe("HTML tag stripping", () => {
    it("removes HTML tags", () => {
      const markdown = "<div>Hello</div> <span>World</span>";
      // "Hello World" = 2 words
      expect(calculateReadingTime(markdown)).toBe(1);
    });

    it("removes self-closing tags", () => {
      const markdown = "Text <br/> more <hr /> text";
      // "Text more text" = 3 words
      expect(calculateReadingTime(markdown)).toBe(1);
    });
  });

  describe("frontmatter stripping", () => {
    it("removes YAML frontmatter", () => {
      const markdown = `---
title: My Article
date: 2024-01-01
tags:
  - one
  - two
---

Actual content here.
      `;
      // "Actual content here." = 3 words
      expect(calculateReadingTime(markdown)).toBe(1);
    });

    it("handles content without frontmatter", () => {
      const markdown = "Just plain content here.";
      expect(calculateReadingTime(markdown)).toBe(1);
    });
  });

  describe("markdown formatting removal", () => {
    it("removes heading markers", () => {
      const markdown = "# Heading One\n## Heading Two\n### Heading Three";
      // "Heading One Heading Two Heading Three" = 6 words
      expect(calculateReadingTime(markdown)).toBe(1);
    });

    it("removes bold and italic markers", () => {
      const markdown =
        "This is **bold** and *italic* and ***both*** and __also__ and _this_.";
      // "This is bold and italic and both and also and this." = 11 words
      expect(calculateReadingTime(markdown)).toBe(1);
    });

    it("removes strikethrough markers", () => {
      const markdown = "This is ~~deleted~~ text.";
      // "This is deleted text." = 4 words
      expect(calculateReadingTime(markdown)).toBe(1);
    });

    it("removes blockquote markers", () => {
      const markdown = "> This is a quote\n> on multiple lines";
      // "This is a quote on multiple lines" = 7 words
      expect(calculateReadingTime(markdown)).toBe(1);
    });
  });

  describe("table formatting removal", () => {
    it("removes table pipe characters", () => {
      const markdown = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
      `;
      // Table cells become words after pipe removal
      expect(calculateReadingTime(markdown)).toBe(1);
    });

    it("removes horizontal rule dashes", () => {
      const markdown = "Text above\n---\nText below\n------\nMore text";
      expect(calculateReadingTime(markdown)).toBe(1);
    });
  });

  describe("realistic content", () => {
    it("calculates reading time for a typical blog post", () => {
      const blogPost = `---
title: Introduction to Testing
date: 2024-01-15
---

# Introduction to Testing

Testing is an essential part of software development. It helps ensure that your code works as expected.

## Why Test?

There are several reasons to write tests:

1. **Catch bugs early** - Tests help you find issues before they reach production.
2. **Documentation** - Tests serve as living documentation of how your code should work.
3. **Refactoring confidence** - With tests, you can refactor code without fear.

\`\`\`javascript
function add(a, b) {
  return a + b;
}

test('adds two numbers', () => {
  expect(add(1, 2)).toBe(3);
});
\`\`\`

Check out the [testing guide](https://example.com/testing) for more information.

![Testing diagram](diagram.png)

## Conclusion

Start testing today!
      `;
      // This should be about 100 words of actual content
      expect(calculateReadingTime(blogPost)).toBe(1);
    });

    it("calculates reading time for a long article", () => {
      // Generate ~1000 words of content
      const paragraph =
        "This is a sample paragraph with about ten words in it. ".repeat(20);
      const longArticle = `
# Long Article

${paragraph}

## Section Two

${paragraph}

## Section Three

${paragraph}

## Section Four

${paragraph}

## Section Five

${paragraph}
      `;
      // ~1000 words = 5 minutes at 200 WPM
      expect(calculateReadingTime(longArticle)).toBeGreaterThanOrEqual(4);
      expect(calculateReadingTime(longArticle)).toBeLessThanOrEqual(6);
    });
  });
});
