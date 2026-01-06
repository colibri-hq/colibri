import { getBlogPosts } from "$lib/content/blog";
import { parseAuthor } from "$lib/content/author";
import { siteConfig } from "$root/site.config";
import type { RequestHandler } from "./$types.js";

export const prerender = true;

export const GET = function GET({ url }) {
  const siteUrl = url.origin;
  const posts = getBlogPosts();

  const items = posts
    .map((post) => {
      const pubDate = new Date(post.metadata.date).toUTCString();
      const link = `${siteUrl}/blog/${post.urlSlug}`;
      const description = post.metadata.excerpt ?? post.metadata.description ?? "";
      const author = parseAuthor(post.metadata.author);

      const tagElements = (post.metadata.tags ?? [])
        .map((tag) => `      <category>${escapeXml(tag)}</category>`)
        .join("\n");

      return `    <item>
      <title><![CDATA[${escapeXml(post.metadata.title)}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${escapeXml(description)}]]></description>
      <author>${escapeXml(author.email ?? "")} (${escapeXml(author.name)})</author>
${tagElements}
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.site.name)} Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Development updates, tutorials, and insights from the ${escapeXml(siteConfig.site.name)} team</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/blog/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "max-age=3600",
    },
  });
} satisfies RequestHandler;

/**
 * Escapes special XML characters.
 */
function escapeXml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
