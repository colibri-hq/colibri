import {
  type Directory,
  getContentTree,
  isDirectory,
  isPage,
  type Page,
} from "$lib/content/content.js";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

export const prerender = true;

export const GET = async function GET() {
  const contentTree = getContentTree();
  const allPages = collectAllPages(contentTree);

  // Filter out draft pages and hidden pages
  const publishedPages = allPages.filter(
    ({ metadata }) => !metadata.draft && !metadata.hideFromMenu,
  );

  const resources: MCPResource[] = publishedPages.map((page) => ({
    uri: `docs://colibri${page.slug}`,
    name: page.slug.replace(/^\//, "") || "index",
    title: page.metadata.title,
    description: page.metadata.description,
    mimeType: "text/markdown",
    annotations: { audience: ["user", "assistant"], priority: calculatePriority(page) },
  }));

  // Sort by priority (highest first), then alphabetically by name
  resources.sort((a, b) => {
    const priorityDiff = (b.annotations?.priority ?? 0) - (a.annotations?.priority ?? 0);

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return a.name.localeCompare(b.name);
  });

  return json(
    {
      resources,
      _meta: {
        totalCount: resources.length,
        generatedAt: new Date().toISOString(),
        baseUri: "docs://colibri",
      },
    },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
} satisfies RequestHandler;

/**
 * Calculate priority based on page metadata. Higher priority for pages with lower order numbers or
 * higher relevance.
 */
function calculatePriority({ metadata: { order, relevance } }: Page) {
  if (relevance !== undefined) {
    return Math.min(1, Math.max(0, relevance));
  }

  if (order !== undefined) {
    // Convert order to priority: lower order = higher priority
    // Order 1 -> priority 0.9, order 10 -> priority 0.5, order 100+ -> priority 0.1
    return Math.max(0.1, 1 - (order / 100) * 0.9);
  }

  return 0.5;
}

/**
 * Recursively collect all pages from the content tree.
 */
function collectAllPages(items: (Page | Directory)[]) {
  const pages: Page[] = [];

  for (const item of items) {
    if (isPage(item)) {
      pages.push(item);
    } else if (isDirectory(item)) {
      if (item.indexPage) {
        pages.push(item.indexPage);
      }

      pages.push(...collectAllPages(item.children));
    }
  }

  return pages;
}

/**
 * MCP Resource format for listing documentation pages.
 * @see https://modelcontextprotocol.io/specification/2025-11-25/server/resources
 */
type MCPResource = {
  uri: string;
  name: string;
  title?: string;
  description?: string;
  mimeType: string;
  annotations?: { audience: ("user" | "assistant")[]; priority: number };
};
