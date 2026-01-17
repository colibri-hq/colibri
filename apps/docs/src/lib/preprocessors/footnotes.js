// @ts-nocheck
/**
 * Svelte preprocessor to transform footnote syntax into HTML.
 * This runs BEFORE mdsvex processes the markdown.
 *
 * Handles GFM-style footnotes:
 * - References: [^1], [^note]
 * - Definitions: [^1]: Footnote text
 */

/**
 * Convert basic markdown formatting to HTML
 * @param {string} text
 * @returns {string}
 */
function convertInlineMarkdown(text) {
  return (
    text
      // Bold: **text** or __text__
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      // Italic: *text* or _text_
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/_([^_]+)_/g, "<em>$1</em>")
      // Inline code: `code`
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // Links: [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  );
}

/**
 * Transform footnote syntax in markdown text
 * @param {string} markdown
 * @returns {string}
 */
function transformFootnotes(markdown) {
  // Collect all footnote definitions and remove them in a single pass
  const footnoteDefRegex = /^\[\^([^\]]+)\]:\s*(.+)$/gm;
  const footnotes = new Map();

  // Single pass: collect definitions and remove them
  let result = markdown.replace(footnoteDefRegex, (_, id, content) => {
    footnotes.set(id, content.trim());
    return "";
  });

  if (footnotes.size === 0) {
    return markdown;
  }

  // Create a mapping from footnote IDs to numbers
  const footnoteNumbers = new Map();
  let counter = 1;

  // Second pass: replace footnote references with superscript links and assign numbers based on order of appearance
  result = result.replace(/\[\^([^\]]+)]/g, (match, id) => {
    // Unknown footnote, leave as-is
    if (!footnotes.has(id)) {
      return match;
    }

    if (!footnoteNumbers.has(id)) {
      footnoteNumbers.set(id, counter++);
    }

    const num = footnoteNumbers.get(id);
    return `<sup class="footnote-ref"><a href="#footnote-${id}" id="footnote-ref-${id}">[${num}]</a></sup>`;
  });

  // Build the footnotes section
  if (footnoteNumbers.size > 0) {
    const sortedFootnotes = [...footnoteNumbers.entries()].sort((a, b) => a[1] - b[1]);

    let footnotesHtml = `
      <section class="footnotes" role="doc-endnotes">
        <hr />
        <ol>
      `;

    for (const [id] of sortedFootnotes) {
      const content = convertInlineMarkdown(footnotes.get(id));
      footnotesHtml += `<li id="footnote-${id}">
        <p>
          ${content} <a href="#footnote-ref-${id}" class="footnote-backref">↩</a>
        </p>
      </li>
      `;
    }

    footnotesHtml += `</ol>\n</section>`;

    // Clean up any extra blank lines from removed definitions
    result = result.replace(/\n{3,}/g, "\n\n");

    result += footnotesHtml;
  }

  return result;
}

/**
 * Svelte preprocessor for footnote syntax
 * @returns {import('svelte/compiler').PreprocessorGroup}
 */
export function footnotesPreprocessor() {
  return {
    name: "footnotes",
    markup({ content, filename }) {
      // Only process .md files
      if (!filename?.endsWith(".md")) {
        return;
      }

      const code = transformFootnotes(content);

      if (code !== content) {
        return { code };
      }
    },
  };
}
