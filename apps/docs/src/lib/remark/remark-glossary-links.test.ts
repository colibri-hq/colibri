import { describe, it, expect } from "vitest";
import { remark } from "remark";
import { remarkGlossaryLinks } from "./remark-glossary-links.js";

describe("remarkGlossaryLinks", () => {
  const processMarkdown = async (markdown: string) => {
    const processor = remark().use(remarkGlossaryLinks);
    const result = await processor.process(markdown);
    return String(result);
  };

  describe("glossary link transformation", () => {
    it("should transform glossary: links into GlossaryTerm components", async () => {
      const input = "You need [PostgreSQL](glossary:postgresql) to run this.";
      const result = await processMarkdown(input);

      expect(result).toContain(
        '<GlossaryTerm term="postgresql">PostgreSQL</GlossaryTerm>',
      );
    });

    it("should handle multiple glossary links in one paragraph", async () => {
      const input =
        "Upload [EPUB](glossary:epub) or [MOBI](glossary:mobi) files.";
      const result = await processMarkdown(input);

      expect(result).toContain('<GlossaryTerm term="epub">EPUB</GlossaryTerm>');
      expect(result).toContain('<GlossaryTerm term="mobi">MOBI</GlossaryTerm>');
    });

    it("should handle glossary links with spaces in text", async () => {
      const input =
        "Configure your [environment variables](glossary:environment-variables).";
      const result = await processMarkdown(input);

      expect(result).toContain(
        '<GlossaryTerm term="environment-variables">environment variables</GlossaryTerm>',
      );
    });

    it("should handle glossary links with different text than term ID", async () => {
      const input = "Store files in [S3 storage](glossary:s3).";
      const result = await processMarkdown(input);

      expect(result).toContain(
        '<GlossaryTerm term="s3">S3 storage</GlossaryTerm>',
      );
    });

    it("should escape quotes in link text", async () => {
      const input = 'Use [the "best" database](glossary:postgresql).';
      const result = await processMarkdown(input);

      expect(result).toContain("the &quot;best&quot; database");
    });

    it("should handle inline code in link text", async () => {
      const input = "Use the [`colibri`](glossary:cli) command.";
      const result = await processMarkdown(input);

      expect(result).toContain(
        '<GlossaryTerm term="cli">colibri</GlossaryTerm>',
      );
    });
  });

  describe("non-glossary links", () => {
    it("should not transform regular HTTP links", async () => {
      const input = "[GitHub](https://github.com)";
      const result = await processMarkdown(input);

      expect(result).not.toContain("GlossaryTerm");
      expect(result).toContain("[GitHub](https://github.com)");
    });

    it("should not transform relative links", async () => {
      const input = "[Getting Started](/getting-started)";
      const result = await processMarkdown(input);

      expect(result).not.toContain("GlossaryTerm");
      expect(result).toContain("[Getting Started](/getting-started)");
    });

    it("should not transform mailto links", async () => {
      const input = "[Email](mailto:test@example.com)";
      const result = await processMarkdown(input);

      expect(result).not.toContain("GlossaryTerm");
      expect(result).toContain("[Email](mailto:test@example.com)");
    });

    it("should not transform anchor links", async () => {
      const input = "[Jump to section](#section)";
      const result = await processMarkdown(input);

      expect(result).not.toContain("GlossaryTerm");
      expect(result).toContain("[Jump to section](#section)");
    });
  });

  describe("edge cases", () => {
    it("should handle empty link text", async () => {
      const input = "[](glossary:postgresql)";
      const result = await processMarkdown(input);

      expect(result).toContain(
        '<GlossaryTerm term="postgresql"></GlossaryTerm>',
      );
    });

    it("should handle term IDs with trailing whitespace", async () => {
      const input = "[PostgreSQL](glossary:postgresql )";
      const result = await processMarkdown(input);

      expect(result).toContain('<GlossaryTerm term="postgresql">');
    });

    it("should handle glossary links in lists", async () => {
      const input =
        "- Upload [EPUB](glossary:epub) files\n- Upload [MOBI](glossary:mobi) files";
      const result = await processMarkdown(input);

      expect(result).toContain('<GlossaryTerm term="epub">EPUB</GlossaryTerm>');
      expect(result).toContain('<GlossaryTerm term="mobi">MOBI</GlossaryTerm>');
    });

    it("should handle glossary links in headings", async () => {
      const input = "## Using [PostgreSQL](glossary:postgresql)";
      const result = await processMarkdown(input);

      expect(result).toContain(
        '<GlossaryTerm term="postgresql">PostgreSQL</GlossaryTerm>',
      );
    });

    it("should handle glossary links with formatted text", async () => {
      const input = "Use [*PostgreSQL*](glossary:postgresql) as database.";
      const result = await processMarkdown(input);

      // The plugin extracts text content recursively, including from formatted nodes
      expect(result).toContain(
        '<GlossaryTerm term="postgresql">PostgreSQL</GlossaryTerm>',
      );
    });

    it("should handle multiple paragraphs with glossary links", async () => {
      const input = `
First paragraph with [EPUB](glossary:epub).

Second paragraph with [MOBI](glossary:mobi).
`;
      const result = await processMarkdown(input);

      expect(result).toContain('<GlossaryTerm term="epub">EPUB</GlossaryTerm>');
      expect(result).toContain('<GlossaryTerm term="mobi">MOBI</GlossaryTerm>');
    });
  });

  describe("complex markdown scenarios", () => {
    it("should handle glossary links mixed with regular links", async () => {
      const input =
        "Visit [GitHub](https://github.com) and learn about [PostgreSQL](glossary:postgresql).";
      const result = await processMarkdown(input);

      expect(result).toContain("[GitHub](https://github.com)");
      expect(result).toContain(
        '<GlossaryTerm term="postgresql">PostgreSQL</GlossaryTerm>',
      );
    });

    it("should handle glossary links in blockquotes", async () => {
      const input = "> Use [PostgreSQL](glossary:postgresql) for best results.";
      const result = await processMarkdown(input);

      expect(result).toContain(
        '<GlossaryTerm term="postgresql">PostgreSQL</GlossaryTerm>',
      );
    });

    it("should handle glossary links in table cells", async () => {
      const input = `
| Format | Description |
|--------|-------------|
| [EPUB](glossary:epub) | Electronic Publication |
| [MOBI](glossary:mobi) | Mobipocket |
`;
      const result = await processMarkdown(input);

      expect(result).toContain('<GlossaryTerm term="epub">EPUB</GlossaryTerm>');
      expect(result).toContain('<GlossaryTerm term="mobi">MOBI</GlossaryTerm>');
    });
  });
});
