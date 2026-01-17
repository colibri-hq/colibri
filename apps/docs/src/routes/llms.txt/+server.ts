import {
  type Directory,
  getContentTree,
  isDirectory,
  isPage,
  type Page,
} from "$lib/content/content.js";
import { text } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

export const prerender = true;

export const GET = async function GET({ url }) {
  const baseUrl = url.origin;
  const tree = getContentTree();
  const { main, optional } = buildSections(tree, baseUrl);
  const lines = [
    "# Colibri Documentation",
    "",
    "> Colibri is a self-hosted ebook library application with a web interface. It supports ebook management, collections, metadata retrieval from 14+ public knowledge graphs, and passwordless authentication via Passkeys.",
    "",
    "Colibri helps you organize and enrich your digital book collection. It automatically fetches metadata from sources like OpenLibrary, WikiData, and other authority databases, and provides a beautiful web interface for browsing your library.",
    "",
  ];

  // Add main sections
  for (const section of main) {
    lines.push(formatSection(section));
    lines.push("");
  }

  // Add optional sections
  if (optional.length > 0) {
    lines.push("## Optional");
    lines.push("");

    for (const { items, title } of optional) {
      lines.push(`### ${title}`);
      lines.push("");

      for (const { description, name, url: itemUrl } of items) {
        if (description) {
          lines.push(`- [${name}](${itemUrl}): ${description}`);
        } else {
          lines.push(`- [${name}](${itemUrl})`);
        }
      }

      lines.push("");
    }
  }

  // Add MCP information
  lines.push("## AI Integration");
  lines.push("");
  lines.push("This documentation is also available via the Model Context Protocol (MCP):");
  lines.push("");
  lines.push(
    `- [MCP Server Discovery](${baseUrl}/.well-known/mcp.json): Server capabilities and endpoint info`,
  );
  lines.push(
    `- [Full Documentation](${baseUrl}/llms-full.txt): Complete documentation in a single file`,
  );
  lines.push("");

  return text(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
} satisfies RequestHandler;

/**
 * Build sections from the content tree.
 */
function buildSections(tree: (Page | Directory)[], baseUrl: string) {
  const main: Section[] = [];
  const optional: Section[] = [];

  for (const item of tree) {
    if (isDirectory(item)) {
      const section: Section = { title: item.title, items: [] };

      // Add index page if exists
      if (item.indexPage && !item.indexPage.metadata.hideFromMenu) {
        section.items.push({
          name: "Overview",
          url: `${baseUrl}${item.slug}`,
          description: item.indexPage.metadata.description,
        });
      }

      // Add child pages
      for (const child of item.children) {
        if (isPage(child) && !child.metadata.hideFromMenu) {
          section.items.push({
            name: child.metadata.title,
            url: `${baseUrl}${child.slug}`,
            description: child.metadata.description,
          });
        } else if (
          isDirectory(child) &&
          child.indexPage &&
          !child.indexPage.metadata.hideFromMenu
        ) {
          section.items.push({
            name: child.title,
            url: `${baseUrl}${child.slug}`,
            description: child.indexPage.metadata.description,
          });
        }
      }

      if (section.items.length > 0) {
        // Blog and legal sections are optional
        if (item.slug === "/blog" || item.slug === "/legal") {
          optional.push(section);
        } else {
          main.push(section);
        }
      }
    } else if (isPage(item) && !item.metadata.hideFromMenu) {
      // Top-level pages go into a "General" section
      let generalSection = main.find(({ title }) => title === "General");

      if (!generalSection) {
        generalSection = { title: "General", items: [] };
        main.unshift(generalSection);
      }

      generalSection.items.push({
        name: item.metadata.title,
        url: `${baseUrl}${item.slug}`,
        description: item.metadata.description,
      });
    }
  }

  return { main, optional };
}

/**
 * Format a section as markdown.
 */
function formatSection({ items, title }: Section) {
  const lines: string[] = [`## ${title}`, ""];

  for (const { description, name, url } of items) {
    if (description) {
      lines.push(`- [${name}](${url}): ${description}`);
    } else {
      lines.push(`- [${name}](${url})`);
    }
  }

  return lines.join("\n");
}

/**
 * Generate llms.txt content following the specification at https://llmstxt.org/
 *
 * Structure:
 * - H1 with project name (required)
 * - Blockquote with brief summary
 * - Sections with documentation links
 * - Optional section for less important content
 */

type Section = { title: string; items: { name: string; url: string; description?: string }[] };
