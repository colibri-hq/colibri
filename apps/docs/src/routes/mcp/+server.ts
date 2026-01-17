import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

// This endpoint runs as a Cloudflare Worker, NOT prerendered
export const prerender = false;

/**
 * MCP Protocol Version
 * @see https://modelcontextprotocol.io/specification/2025-11-25
 */
const PROTOCOL_VERSION = "2025-03-26";

/**
 * Server information
 */
const SERVER_INFO = { name: "colibri-docs", version: "1.0.0" };

/**
 * Server capabilities - we only support resources (read-only documentation)
 */
const CAPABILITIES = { resources: { subscribe: false, listChanged: false } };

/**
 * JSON-RPC error codes
 */
const ErrorCodes = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  ResourceNotFound: -32002,
} as const;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

/**
 * Create a JSON-RPC success response
 */
function success(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

/**
 * Create a JSON-RPC error response
 */
function errorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

/**
 * Handle the initialize method
 */
function handleInitialize(): unknown {
  return { protocolVersion: PROTOCOL_VERSION, capabilities: CAPABILITIES, serverInfo: SERVER_INFO };
}

/**
 * Handle the resources/list method by fetching prerendered data
 */
async function handleResourcesList(fetchFn: typeof fetch, origin: string): Promise<unknown> {
  const response = await fetchFn(`${origin}/mcp/data/resources.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch resources: ${response.status}`);
  }
  return response.json();
}

/**
 * Handle the resources/read method by fetching prerendered content
 */
async function handleResourcesRead(
  fetchFn: typeof fetch,
  origin: string,
  params: Record<string, unknown> | undefined,
): Promise<unknown> {
  if (!params?.uri || typeof params.uri !== "string") {
    throw { code: ErrorCodes.InvalidParams, message: "Missing or invalid 'uri' parameter" };
  }

  const uri = params.uri as string;

  // Validate URI scheme
  if (!uri.startsWith("docs://colibri/") && !uri.startsWith("docs://colibri")) {
    throw {
      code: ErrorCodes.InvalidParams,
      message: `Invalid URI scheme. Expected 'docs://colibri/...' but got '${uri}'`,
    };
  }

  // Extract slug from URI (docs://colibri/getting-started -> getting-started)
  let slug = uri.replace("docs://colibri/", "").replace("docs://colibri", "");
  if (!slug) slug = "index"; // Root document

  const response = await fetchFn(`${origin}/mcp/data/content/${slug}.json`);
  if (!response.ok) {
    if (response.status === 404) {
      throw { code: ErrorCodes.ResourceNotFound, message: `Resource not found: ${uri}` };
    }
    throw new Error(`Failed to fetch resource: ${response.status}`);
  }

  const content = await response.json();
  return { contents: [content] };
}

/**
 * MCP JSON-RPC handler
 */
export const POST: RequestHandler = async ({ request, fetch, url }) => {
  let requestBody: JsonRpcRequest;

  try {
    requestBody = await request.json();
  } catch {
    return json(errorResponse(null, ErrorCodes.ParseError, "Parse error: Invalid JSON"));
  }

  // Validate JSON-RPC request structure
  if (
    requestBody.jsonrpc !== "2.0" ||
    typeof requestBody.method !== "string" ||
    requestBody.id === undefined
  ) {
    return json(
      errorResponse(requestBody?.id ?? null, ErrorCodes.InvalidRequest, "Invalid JSON-RPC request"),
    );
  }

  const { id, method, params } = requestBody;
  const origin = url.origin;

  try {
    let result: unknown;

    switch (method) {
      case "initialize":
        result = handleInitialize();
        break;

      case "initialized":
        // Client notification that initialization is complete - no response needed
        return new Response(null, { status: 202 });

      case "resources/list":
        result = await handleResourcesList(fetch, origin);
        break;

      case "resources/read":
        result = await handleResourcesRead(fetch, origin, params);
        break;

      case "ping":
        result = {};
        break;

      default:
        return json(errorResponse(id, ErrorCodes.MethodNotFound, `Method not found: ${method}`));
    }

    return json(success(id, result), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    // Handle typed errors with code
    if (err && typeof err === "object" && "code" in err && "message" in err) {
      return json(errorResponse(id, err.code as number, err.message as string));
    }

    // Handle generic errors
    console.error("MCP handler error:", err);
    return json(
      errorResponse(
        id,
        ErrorCodes.InternalError,
        err instanceof Error ? err.message : "Internal server error",
      ),
    );
  }
};

/**
 * OPTIONS handler for CORS preflight
 */
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, MCP-Protocol-Version, MCP-Session-Id",
      "Access-Control-Max-Age": "86400",
    },
  });
};
