import { getAllPages, getPage, normalizeSlug, type Page } from "$lib/content/content.js";
import { error, json } from "@sveltejs/kit";
import type { EntryGenerator, RequestHandler } from "./$types.js";

export const prerender = true;
export const trailingSlash = "never";

// Load all Markdown files as raw strings at build time
const rawFiles = import.meta.glob<string>("$content/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

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
 * Generate entries for all pages to prerender.
 */
export const entries = function entries() {
  const pages = getAllPages();

  return Array.from(pages.keys())
    .filter((slug) => {
      const page = pages.get(slug);

      return page && !page.metadata.draft && !page.metadata.hideFromMenu;
    })
    .map((slug) => ({ slug: slug.replace(/^\//, "") }));
} satisfies EntryGenerator;

export const GET = async function GET({ params }) {
  const slug = normalizeSlug(params.slug);
  const page = getPage(slug);

  if (!page) {
    error(404, `Resource not found: ${slug}`);
  }

  const rawContent = contentMap.get(slug);

  if (!rawContent) {
    error(404, `Content not found for: ${slug}`);
  }

  const content = stripFrontmatter(rawContent);

  return json(
    {
      uri: `docs://colibri${page.slug}`,
      mimeType: "text/markdown",
      text: content,
      annotations: { audience: ["user", "assistant"], priority: calculatePriority(page) },
    },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
} satisfies RequestHandler;

/**
 * Strip frontmatter from markdown content.
 */
function stripFrontmatter(content: string) {
  return content.replace(/^---[\s\S]*?---\n*/, "");
}

/**
 * Calculate priority based on page metadata.
 */
function calculatePriority({ metadata: { order, relevance } }: Page) {
  if (relevance !== undefined) {
    return Math.min(1, Math.max(0, relevance));
  }

  if (order !== undefined) {
    return Math.max(0.1, 1 - (order / 100) * 0.9);
  }

  return 0.5;
}
