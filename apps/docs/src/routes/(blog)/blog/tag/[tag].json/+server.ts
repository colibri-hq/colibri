import { type BlogPost, getBlogTags, getPostsByTag } from "$lib/content/blog.js";
import { error, json } from "@sveltejs/kit";
import type { EntryGenerator, RequestHandler } from "./$types.js";

export const prerender = true;
export const trailingSlash = "never";

export const GET = async function GET({ params, url }) {
  const tag = decodeURIComponent(params.tag);
  const posts = getPostsByTag(tag);
  const baseUrl = url.origin;

  if (posts.length === 0) {
    error(404, `No posts found for tag: ${tag}`);
  }

  const response: TagPostsResponse = {
    type: "tag-posts",
    tag,
    posts: posts.map(summarizePost),
    total: posts.length,
    links: {
      html: `${baseUrl}/blog/tag/${encodeURIComponent(tag)}`,
      json: `${baseUrl}/blog/tag/${encodeURIComponent(tag)}.json`,
      tagListing: `${baseUrl}/blog/tag.json`,
    },
  };

  return json(response, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Link: `<${response.links.html}>; rel="alternate"; type="text/html"`,
    },
  });
} satisfies RequestHandler;

export const entries = function entries() {
  const tags = getBlogTags();

  return Array.from(tags.keys()).map((tag) => ({ tag: encodeURIComponent(tag) }));
} satisfies EntryGenerator;

function summarizePost(post: BlogPost): BlogPostSummary {
  return {
    slug: post.slug,
    urlSlug: post.urlSlug,
    title: post.metadata.title,
    description: post.metadata.description,
    date: post.metadata.date,
    author: post.metadata.author,
    tags: post.metadata.tags ?? [],
  };
}

type BlogPostSummary = {
  slug: string;
  urlSlug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
};

type TagPostsResponse = {
  type: "tag-posts";
  tag: string;
  posts: BlogPostSummary[];
  total: number;
  links: { html: string; json: string; tagListing: string };
};
