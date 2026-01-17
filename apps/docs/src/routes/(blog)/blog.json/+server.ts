import { type BlogPost, getBlogPosts, getFeaturedPosts } from "$lib/content/blog.js";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const prerender = true;
export const trailingSlash = "never";

export const GET = async function GET({ url }) {
  const posts = getBlogPosts();
  const featured = getFeaturedPosts();
  const baseUrl = url.origin;

  const response: BlogListingResponse = {
    type: "blog-listing",
    posts: posts.map(summarizePost),
    featured: featured.map(summarizePost),
    total: posts.length,
    links: { html: `${baseUrl}/blog`, json: `${baseUrl}/blog.json` },
  };

  return json(response, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Link: `<${response.links.html}>; rel="alternate"; type="text/html"`,
    },
  });
} satisfies RequestHandler;

function summarizePost({ metadata, slug, urlSlug }: BlogPost): BlogPostSummary {
  return {
    slug: slug,
    urlSlug: urlSlug,
    title: metadata.title,
    description: metadata.description,
    date: metadata.date,
    author: metadata.author,
    tags: metadata.tags ?? [],
    featured: metadata.featured ?? false,
    heroImage: metadata.heroImage,
    excerpt: metadata.excerpt,
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
  featured: boolean;
  heroImage?: string;
  excerpt?: string;
};

type BlogListingResponse = {
  type: "blog-listing";
  posts: BlogPostSummary[];
  featured: BlogPostSummary[];
  total: number;
  links: { html: string; json: string };
};
