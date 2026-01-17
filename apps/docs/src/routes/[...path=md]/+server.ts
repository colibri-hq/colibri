import { getAllPages } from "$lib/content/content.js";
import { error } from "@sveltejs/kit";
import type { EntryGenerator, RequestHandler } from "./$types.js";

export const prerender = true;

// Load all Markdown files as raw strings at build time
const rawFiles = import.meta.glob("$content/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const contentMap = new Map<string, string>();

for (const [path, content] of Object.entries(rawFiles)) {
  const slug =
    path
      .replace(/^.*\/content/, "")
      .replace(/\.md$/, "")
      .replace(/\/(index|overview)$/, "") || "/";

  contentMap.set(slug, content);
}

// Generate entries for all pages with .md suffix
// Exclude blog posts - they're handled by dedicated /blog/[slug].md endpoints
export const entries: EntryGenerator = () =>
  Array.from(getAllPages().keys())
    .filter((slug) => !slug.startsWith("/blog/"))
    .map((slug) => ({ path: `${slug.replace(/^\//, "")}.md` }));

export const GET = async function GET({ params }) {
  const path = params.path;

  // Remove .md extension to get the slug
  const slug = "/" + path.slice(0, -3);

  const content = contentMap.get(slug);

  if (!content) {
    error(404, "Not found");
  }

  // Strip frontmatter
  const markdown = content.replace(/^---[\s\S]*?---\n*/, "");

  return new Response(markdown, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
} satisfies RequestHandler;
