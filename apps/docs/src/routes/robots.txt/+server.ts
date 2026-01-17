import type { RequestHandler } from "./$types.js";

export const prerender = true;

export const GET = function GET({ url }) {
  const siteUrl = url.origin;

  const robots = `# allow crawling everything by default
User-agent: *
Disallow:

Sitemap: ${siteUrl}/sitemap.xml
`;

  return new Response(robots, { headers: { "Content-Type": "text/plain" } });
} satisfies RequestHandler;
