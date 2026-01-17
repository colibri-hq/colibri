import GithubSlugger from "github-slugger";

/**
 * @typedef {Object} TocHeading
 * @property {string} id - The heading ID (slug)
 * @property {string} text - The heading text content
 * @property {number} level - The heading level (1-6)
 */

/**
 * Remark plugin to extract headings from markdown and expose them as metadata.
 *
 * This plugin extracts all headings from the document and stores them in
 * file.data.fm.headings, which mdsvex exposes as part of the page metadata.
 * This enables server-side rendering of the Table of Contents.
 *
 * The slugging algorithm matches rehype-slug (both use github-slugger),
 * ensuring heading IDs are consistent.
 *
 * @returns {import('unified').Transformer}
 */
export function remarkExtractHeadings() {
  return function transformer(tree, file) {
    const slugger = new GithubSlugger();

    /** @type {TocHeading[]} */
    const headings = [];

    // Walk through all children looking for headings
    // We use a simple iteration instead of unist-util-visit to avoid extra dependencies
    visitHeadings(tree, (node) => {
      const text = extractText(node);
      const id = slugger.slug(text);

      headings.push({ id, text, level: node.depth });
    });

    // Ensure file.data.fm exists (mdsvex may have already created it for frontmatter)
    // mdsvex adds 'fm' to file.data for frontmatter
    const data = /** @type {{ fm?: Record<string, unknown> }} */ (file.data);
    data.fm = data.fm || {};
    data.fm.headings = headings;
  };
}

export default remarkExtractHeadings;

/**
 * Visit all heading nodes in the tree
 *
 * @param {any} tree - The MDAST tree
 * @param {(node: any) => void} callback - Function to call for each heading
 */
function visitHeadings(tree, callback) {
  if (!tree.children) return;

  for (const node of tree.children) {
    if (node.type === "heading") {
      callback(node);
    }
    // Recurse into children (headings can be nested in some edge cases)
    if (node.children) {
      visitHeadings(node, callback);
    }
  }
}

/**
 * Recursively extract text content from a node
 *
 * @param {any} node - MDAST node
 * @returns {string} - Plain text content
 */
function extractText(node) {
  if (node.type === "text") {
    return node.value;
  }

  if (node.children) {
    return node.children.map(extractText).join("");
  }

  return "";
}
