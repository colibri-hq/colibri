import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const prerender = true;

/**
 * MCP Server Discovery endpoint
 * @see https://modelcontextprotocol.io/specification/2025-11-25
 *
 * This endpoint allows clients to discover the MCP server capabilities and endpoint location.
 */
export const GET = async function GET({ url }) {
  const baseUrl = url.origin;

  return json(
    {
      name: "colibri-docs",
      version: "1.0.0",
      description:
        "Colibri documentation - Model Context Protocol server for AI agents",
      mcpEndpoint: "/mcp",
      protocolVersion: "2025-03-26",
      capabilities: {
        resources: {
          subscribe: false,
          listChanged: false,
        },
      },
      resources: {
        uriScheme: "docs://colibri",
        description: "Documentation pages accessible via MCP resources/read",
        listEndpoint: "/mcp/data/resources.json",
      },
      alternateFormats: {
        html: "/{slug}",
        json: "/{slug}.json",
        markdown: "/{slug}.md",
        llmsTxt: "/llms.txt",
        llmsFullTxt: "/llms-full.txt",
      },
      contact: {
        homepage: "https://github.com/colibri-hq/colibri",
        documentation: baseUrl,
        issues: "https://github.com/colibri-hq/colibri/issues",
      },
    },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    },
  );
} satisfies RequestHandler;
