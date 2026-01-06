const WORDS_PER_MINUTE = 200;

/**
 * Calculates the estimated reading time for markdown content.
 * Strips code blocks, inline code, links, and markdown formatting before counting words.
 *
 * @param markdown - The raw markdown content
 * @returns Estimated reading time in minutes (minimum 1)
 */
export function calculateReadingTime(markdown: string): number {
  // Strip code blocks (fenced and indented)
  let text = markdown.replace(/```[\s\S]*?```/g, "");
  text = text.replace(/`[^`]*`/g, ""); // Inline code

  // Strip links but keep link text
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");

  // Strip images
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, "");

  // Strip HTML tags
  text = text.replace(/<[^>]*>/g, "");

  // Strip frontmatter
  text = text.replace(/^---[\s\S]*?---/m, "");

  // Strip markdown formatting characters
  text = text.replace(/[#*_~>]/g, "");

  // Strip table formatting
  text = text.replace(/\|/g, " ");
  text = text.replace(/-{3,}/g, "");

  // Count words
  const words = text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  const minutes = Math.ceil(words.length / WORDS_PER_MINUTE);

  // Return at least 1 minute
  return Math.max(1, minutes);
}
