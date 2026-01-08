import { text } from "@sveltejs/kit";
import {
  type Directory,
  getContentTree,
  isDirectory,
  isPage,
  type Page,
} from "$lib/content/content.js";
import type { RequestHandler } from "./$types.js";

export const prerender = true;

// Load all Markdown files as raw strings at build time
const rawFiles = import.meta.glob("$content/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Map raw content by slug
const contentMap = new Map<string, string>();

for (const [path, content] of Object.entries(rawFiles)) {
  const slug =
    path
      .replace(/^.*\/content/, "")
      .replace(/\.md$/, "")
      .replace(/\/(index|overview)$/, "") || "/";

  contentMap.set(slug, content);
}

/**
 * Strip frontmatter from markdown content.
 */
function stripFrontmatter(content: string) {
  return content.replace(/^---[\s\S]*?---\n*/, "");
}

/**
 * Recursively collect all pages in navigation order.
 */
function collectPages(items: (Page | Directory)[]) {
  const pages: Page[] = [];

  for (const item of items) {
    if (isPage(item)) {
      if (!item.metadata.draft && !item.metadata.hideFromMenu) {
        pages.push(item);
      }
    } else if (isDirectory(item)) {
      // Add index page first
      if (
        item.indexPage &&
        !item.indexPage.metadata.draft &&
        !item.indexPage.metadata.hideFromMenu
      ) {
        pages.push(item.indexPage);
      }

      // Then recurse into children
      pages.push(...collectPages(item.children));
    }
  }

  return pages;
}

/**
 * Generate llms-full.txt with all documentation content concatenated.
 * This is useful for AI agents that can handle large context.
 */
export const GET = async function GET({ url }) {
  const baseUrl = url.origin;
  const tree = getContentTree();
  const pages = collectPages(tree);

  // Filter out blog posts for the main documentation
  // (they're time-sensitive and may not be as relevant)
  const docPages = pages.filter(({ slug }) => !slug.startsWith("/blog/"));
  const sections = [
    "# Colibri Documentation (Complete)",
    "",
    "> This file contains the complete Colibri documentation for AI agents.",
    "> For a summary with links, see /llms.txt",
    "> For structured access, use the MCP endpoint at /mcp",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Total pages: ${docPages.length}`,
    "",
    "---",
    "",
  ];

  // Add each page's content
  for (const {
    metadata: { title },
    slug,
  } of docPages) {
    const rawContent = contentMap.get(slug);

    if (!rawContent) {
      continue;
    }

    const content = stripFrontmatter(rawContent);

    sections.push(`<!-- Page: ${slug} -->`);
    sections.push(`<!-- URL: ${baseUrl}${slug} -->`);
    sections.push("");

    // The content should already have its own heading, but we add context
    if (!content.trimStart().startsWith("#")) {
      sections.push(`# ${title}`);
      sections.push("");
    }

    sections.push(content.trim());
    sections.push("");
    sections.push("---");
    sections.push("");
  }

  // Add footer
  sections.push("<!-- End of Colibri Documentation -->");

  return text(sections.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
} satisfies RequestHandler;
