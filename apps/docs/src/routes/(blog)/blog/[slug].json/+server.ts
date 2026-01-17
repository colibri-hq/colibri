import { resolve } from "$app/paths";
import { type AuthorWithGravatar, getAuthorWithGravatar } from "$lib/content/author.js";
import {
  type BlogPostMetadata,
  getAdjacentPosts,
  getBlogPost,
  getBlogPosts,
  getRelatedPosts,
  getSeriesPosts,
  getSeriesSlug,
} from "$lib/content/blog.js";
import { error, json } from "@sveltejs/kit";
import type { EntryGenerator, RequestHandler } from "./$types.js";

export const prerender = true;

export const trailingSlash = "never";

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
 * Strip frontmatter from markdown content
 */
function stripFrontmatter(content: string) {
  return content.replace(/^---[\s\S]*?---\n*/, "");
}

/**
 * Build alternate links for a given base URL
 */
function buildAlternateLinks(baseUrl: string, slug: string) {
  const normalizedSlug = slug.endsWith("/") ? slug.slice(0, -1) : slug;
  const path = normalizedSlug || "";
  return {
    html: `${baseUrl}${path}`,
    markdown: `${baseUrl}${path}.md`,
    json: `${baseUrl}${path}.json`,
  };
}

export const entries = function entries() {
  const blogPosts = getBlogPosts();
  return blogPosts.map((post) => ({ slug: post.urlSlug }));
} satisfies EntryGenerator;

export const GET = async function GET({ params, url }) {
  const urlSlug = params.slug;
  const post = getBlogPost(urlSlug);
  const baseUrl = url.origin;

  if (!post) {
    error(404, "Blog post not found");
  }

  const fullSlug = `/blog/${urlSlug}`;
  const rawContent = contentMap.get(fullSlug);
  if (!rawContent) {
    error(404, "Blog content not found");
  }

  const author = await getAuthorWithGravatar(post.metadata.author, 64);
  const adjacent = getAdjacentPosts(urlSlug);
  const relatedPosts = getRelatedPosts(post, 3);

  // Build series info if applicable
  let seriesInfo: BlogPostJsonResponse["series"] = undefined;
  if (post.metadata.series) {
    const seriesPosts = getSeriesPosts(post.metadata.series);
    const currentPosition = seriesPosts.findIndex((p) => p.urlSlug === urlSlug);
    seriesInfo = {
      name: post.metadata.series,
      slug: getSeriesSlug(post.metadata.series),
      currentPosition: currentPosition + 1,
      totalPosts: seriesPosts.length,
      posts: seriesPosts.map((p) => ({ slug: p.urlSlug, title: p.metadata.title })),
    };
  }

  const response: BlogPostJsonResponse = {
    type: "blog",
    slug: urlSlug,
    metadata: post.metadata,
    author: { name: author.name, email: author.email, gravatarUrl: author.gravatarUrl },
    content: stripFrontmatter(rawContent),
    navigation: {
      breadcrumbs: [
        { title: "Home", href: resolve("/") },
        { title: "Blog", href: resolve("/(blog)/blog") },
        { title: post.metadata.title, href: resolve("/(blog)/blog/[slug]", { slug: urlSlug }) },
      ],
      adjacent: {
        previous: adjacent.previous
          ? { slug: adjacent.previous.urlSlug, title: adjacent.previous.metadata.title }
          : undefined,
        next: adjacent.next
          ? { slug: adjacent.next.urlSlug, title: adjacent.next.metadata.title }
          : undefined,
      },
    },
    toc: post.metadata.headings ?? [],
    links: buildAlternateLinks(baseUrl, `/blog/${urlSlug}`),
    series: seriesInfo,
    relatedPosts: relatedPosts.map((p) => ({
      slug: p.urlSlug,
      title: p.metadata.title,
      tags: p.metadata.tags ?? [],
    })),
  };

  return json(response, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Link: `<${response.links.html}>; rel="alternate"; type="text/html"`,
    },
  });
} satisfies RequestHandler;

type BlogPostJsonResponse = {
  type: "blog";
  slug: string;
  metadata: BlogPostMetadata;
  author: AuthorWithGravatar;
  content: string;
  navigation: {
    breadcrumbs: Array<{ title: string; href: string }>;
    adjacent: {
      previous?: { slug: string; title: string };
      next?: { slug: string; title: string };
    };
  };
  toc: Array<{ id: string; text: string; level: number }>;
  links: ReturnType<typeof buildAlternateLinks>;
  series?: {
    name: string;
    slug: string;
    currentPosition: number;
    totalPosts: number;
    posts: Array<{ slug: string; title: string }>;
  };
  relatedPosts: Array<{ slug: string; title: string; tags: string[] }>;
};
