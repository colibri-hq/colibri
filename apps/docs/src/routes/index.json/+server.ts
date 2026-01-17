import { getBlogPosts } from "$lib/content/blog.js";
import { getContentTree, isDirectory, isPage, type Directory } from "$lib/content/content.js";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";
import { siteConfig, blogConfig } from "../../../site.config.js";

export const prerender = true;
export const trailingSlash = "never";

type SectionSummary = {
  title: string;
  description?: string;
  slug: string;
  type: "page" | "directory";
  order?: number;
  links: { html: string; json: string; markdown?: string };
};

type IndexResponse = {
  type: "index";
  site: { name: string; description: string; url: string };
  sections: SectionSummary[];
  blog: {
    title: string;
    description: string;
    postCount: number;
    latestPost?: { title: string; date: string; slug: string };
    links: { html: string; json: string; feed: string; archive: string };
  };
  links: { self: { html: string; json: string }; sitemap: string; feed: string };
};

export const GET: RequestHandler = async ({ url }) => {
  const baseUrl = url.origin;
  const tree = getContentTree();
  const posts = getBlogPosts();
  const latestPost = posts[0];

  // Get top-level sections from content tree
  const sections: SectionSummary[] = tree
    .filter((item) => {
      // Exclude blog from content sections (it has its own entry)
      if (isPage(item)) {
        return !item.slug.startsWith("/blog");
      }
      if (isDirectory(item)) {
        return !item.slug.startsWith("/blog");
      }
      return false;
    })
    .map((item) => {
      if (isPage(item)) {
        return {
          title: item.metadata.title,
          description: item.metadata.description,
          slug: item.slug,
          type: "page" as const,
          order: item.metadata.order,
          links: {
            html: `${baseUrl}${item.slug}`,
            json: `${baseUrl}${item.slug}.json`,
            markdown: `${baseUrl}${item.slug}.md`,
          },
        };
      } else {
        // Directory
        const dir = item as Directory;
        return {
          title: dir.title,
          description: dir.metadata?.description,
          slug: dir.slug,
          type: "directory" as const,
          order: dir.metadata?.order,
          links: {
            html: `${baseUrl}${dir.slug}`,
            json: `${baseUrl}${dir.slug}.json`,
            markdown: dir.indexPage ? `${baseUrl}${dir.slug}.md` : undefined,
          },
        };
      }
    })
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  const response: IndexResponse = {
    type: "index",
    site: {
      name: siteConfig.site.name,
      description: siteConfig.site.description ?? "",
      url: siteConfig.site.url,
    },
    sections,
    blog: {
      title: blogConfig.title,
      description: blogConfig.description,
      postCount: posts.length,
      latestPost: latestPost
        ? {
            title: latestPost.metadata.title,
            date: latestPost.metadata.date,
            slug: latestPost.urlSlug,
          }
        : undefined,
      links: {
        html: `${baseUrl}/blog`,
        json: `${baseUrl}/blog.json`,
        feed: `${baseUrl}/blog/feed.xml`,
        archive: `${baseUrl}/blog/archive.json`,
      },
    },
    links: {
      self: { html: baseUrl, json: `${baseUrl}/index.json` },
      sitemap: `${baseUrl}/sitemap.xml`,
      feed: `${baseUrl}/feed.xml`,
    },
  };

  return json(response, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Link: `<${baseUrl}>; rel="alternate"; type="text/html"`,
    },
  });
};
