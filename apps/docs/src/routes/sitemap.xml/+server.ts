import { getAllPages } from "$lib/content/content.js";
import type { RequestHandler } from "./$types.js";

export const prerender = true;

export const GET: RequestHandler = ({ url }) => {
  const siteUrl = url.origin;
  const pages = getAllPages();

  const urls = Array.from(pages.values())
    .map((page) => {
      const loc = `${siteUrl}${page.slug}`;
      const lastmod = page.metadata.date;
      // Index pages (directories) get higher priority
      const priority = page.isIndexPage ? "0.8" : "0.6";

      return `  <url>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
    <priority>${priority}</priority>
  </url>`;
    })
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}</loc>
    <priority>1.0</priority>
  </url>
${urls}
</urlset>`;

  return new Response(sitemap, { headers: { "Content-Type": "application/xml" } });
};
