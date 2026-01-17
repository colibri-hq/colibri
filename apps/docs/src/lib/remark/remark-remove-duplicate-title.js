/**
 * Remark plugin to remove the first h1 heading if it matches the frontmatter title.
 *
 * This prevents duplicate titles when both frontmatter and Markdown content
 * contain the same title - the page header already displays the frontmatter title.
 *
 * @returns {import('unified').Transformer}
 */
export const remarkRemoveDuplicateTitle = function remarkRemoveDuplicateTitle() {
  return function remarkRemoveDuplicateTitle(tree, file) {
    // Get the frontmatter title from the VFile data. mdsvex stores frontmatter in file.data.fm
    // @ts-expect-error -- mdsvex adds 'fm' to file.data
    const frontmatterTitle = file.data?.fm?.title;

    if (!frontmatterTitle) {
      return;
    }

    // Normalize the frontmatter title for comparison
    const normalizedFmTitle = normalizeText(frontmatterTitle);

    // Find the first h1 heading in the document
    // @ts-expect-error -- tree is of type 'import('mdast').Root'
    const { children } = tree;

    for (let i = 0; i < children.length; i++) {
      const node = children[i];

      if (node.type === "heading" && node.depth === 1) {
        // Extract the text content from the heading
        const headingText = extractText(node);
        const normalizedHeading = normalizeText(headingText);

        // If the h1 matches the frontmatter title, remove it
        if (normalizedHeading === normalizedFmTitle) {
          children.splice(i, 1);
        }

        // Only check the first h1
        break;
      }
    }
  };
};

export default remarkRemoveDuplicateTitle;

/**
 * Normalize text for comparison: trim whitespace and convert to lowercase
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  return text.trim().toLowerCase();
}

/**
 * Recursively extract text content from a node
 *
 * @param {any} node
 * @returns {string}
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
