import { error } from "@sveltejs/kit";
import { getBlogPost, getBlogPosts } from "$lib/content/blog.js";
import type { EntryGenerator, RequestHandler } from "./$types.js";

export const prerender = true;

export const trailingSlash = "never";

// Load all blog Markdown files as raw strings at build time
const rawFiles = import.meta.glob("$content/blog/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Map raw content by URL slug
const contentMap = new Map<string, string>();

for (const [path, content] of Object.entries(rawFiles)) {
  // Extract slug from path like "/content/blog/2024-12-15-introducing-colibri-v3.md"
  const match = path.match(/\/blog\/(.+)\.md$/);

  if (match?.[1]) {
    contentMap.set(match[1], content);
  }
}

/**
 * Strip frontmatter from markdown content
 */
function stripFrontmatter(content: string) {
  return content.replace(/^---[\s\S]*?---\n*/, "");
}

/**
 * Generate entries for all blog posts with .md suffix
 */
export const entries = function entries() {
  const posts = getBlogPosts();

  return posts.map(({ urlSlug: slug }) => ({ slug }));
} satisfies EntryGenerator;
export const GET = async function GET({ params: { slug }, url }) {
  const post = getBlogPost(slug);
  const baseUrl = url.origin;

  if (!post) {
    error(404, `Blog post not found: ${slug}`);
  }

  const rawContent = contentMap.get(slug);

  if (!rawContent) {
    error(404, `Blog content not found: ${slug}`);
  }

  const markdown = stripFrontmatter(rawContent);

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      Link: `<${baseUrl}/blog/${slug}>; rel="alternate"; type="text/html", <${baseUrl}/blog/${slug}.json>; rel="alternate"; type="application/json"`,
    },
  });
} satisfies RequestHandler;
