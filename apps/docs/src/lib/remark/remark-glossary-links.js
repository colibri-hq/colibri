import { visit } from "unist-util-visit";

/**
 * Remark plugin to transform glossary links into GlossaryTerm components
 *
 * @example
 * Input:  [PostgreSQL](glossary:postgresql)
 * Output: <GlossaryTerm term="postgresql">PostgreSQL</GlossaryTerm>
 *
 * Benefits:
 * - Clean markdown syntax
 * - Works in markdown preview (renders as link)
 * - No script imports needed in each file
 * - Explicit control over which terms get tooltips
 *
 * Note: Validation happens at runtime in the GlossaryTerm component,
 * not at build time, to avoid Node.js module loading issues.
 */
export function remarkGlossaryLinks() {
  return (tree, file) => {
    visit(tree, "link", (node, index, parent) => {
      // Skip non-glossary links
      if (!node.url?.startsWith("glossary:")) {
        return;
      }

      // Extract term ID from URL
      const termId = node.url.replace("glossary:", "").trim();

      // Extract link text recursively (handles nested formatting like **bold**)
      function extractText(node) {
        if (node.type === "text") {
          return node.value;
        } else if (node.type === "inlineCode") {
          return node.value;
        } else if (node.children) {
          return node.children.map(extractText).join("");
        }
        return "";
      }

      const text = node.children.map(extractText).join("");

      // Escape quotes in text for HTML attribute safety
      const escapedText = text.replace(/"/g, "&quot;");

      // Create GlossaryTerm component
      const html = `<GlossaryTerm term="${termId}">${escapedText}</GlossaryTerm>`;

      // Replace link node with HTML node
      parent.children[index] = { type: "html", value: html };
    });
  };
}

export default remarkGlossaryLinks;
