import { getAllPages } from "$lib/content/content";
import { siteConfig } from "$root/site.config";
import type { RequestHandler } from "./$types.js";

export const prerender = true;

export const GET = function GET({ url }) {
  const siteUrl = url.origin;
  const pages = getAllPages();

  // Sort by date, most recent first, and filter to pages with dates
  const sortedPages = Array.from(pages.values())
    .filter((page) => page.metadata.date)
    .sort((a, b) => new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime())
    .slice(0, 20); // Limit to 20 most recent

  const items = sortedPages
    .map((page) => {
      const pubDate = new Date(page.metadata.date).toUTCString();
      const link = `${siteUrl}${page.slug}`;
      const description = page.metadata.description || "";

      return `    <item>
      <title><![CDATA[${escapeXml(page.metadata.title)}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${escapeXml(description)}]]></description>
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.site.name)} Documentation</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(siteConfig.site.description ?? "Documentation")}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: { "Content-Type": "application/xml", "Cache-Control": "max-age=3600" },
  });
} satisfies RequestHandler;

/**
 * Escapes special XML characters.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
