/**
 * Unified API Authentication Module
 *
 * Supports multiple authentication methods for API requests:
 * - Basic Auth: email:api_key (for scripts, e-readers, OPDS)
 * - Bearer Token: OAuth 2.0 access tokens (for OAuth clients)
 * - Session: JWT cookie (for browser requests)
 */

import type { Database } from "@colibri-hq/sdk";
import {
  validateApiKey,
  updateApiKeyLastUsed,
  findUserByEmail,
  loadAccessToken,
  type ApiKey,
} from "@colibri-hq/sdk";
import type { ScopeName } from "@colibri-hq/sdk/scopes";
import type { Cookies } from "@sveltejs/kit";
import { resolveUserId } from "./auth";

export type AuthMethod = "basic" | "bearer" | "session";

export interface ApiAuthResult {
  /** Authenticated user ID */
  userId: string;
  /** Authentication method used */
  method: AuthMethod;
  /** Granted scopes (null for session auth = full access) */
  scopes: string[] | null;
  /** API key record (only for Basic Auth) */
  apiKey?: ApiKey;
  /** Client ID (only for Bearer token) */
  clientId?: string;
}

/**
 * Authenticate an API request using any supported method.
 *
 * Checks in order:
 * 1. Authorization: Basic (API key)
 * 2. Authorization: Bearer (OAuth access token)
 * 3. Session cookie (JWT)
 *
 * @returns Authentication result or null if unauthenticated
 */
export async function authenticateApiRequest(
  request: Request,
  database: Database,
  cookies?: Cookies,
): Promise<ApiAuthResult | null> {
  const authorization = request.headers.get("Authorization");

  // Try Basic Auth (API key)
  if (authorization?.startsWith("Basic ")) {
    return authenticateBasicAuth(request, database);
  }

  // Try Bearer token (OAuth)
  if (authorization?.startsWith("Bearer ")) {
    return authenticateBearerToken(authorization, database);
  }

  // Fall back to session cookie
  if (cookies) {
    return authenticateSession(cookies);
  }

  return null;
}

/**
 * Authenticate using Basic Auth with API key.
 * Username = user email, Password = API key
 */
async function authenticateBasicAuth(
  request: Request,
  database: Database,
): Promise<ApiAuthResult | null> {
  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Basic ")) {
    return null;
  }

  try {
    // Decode base64 credentials
    const base64Credentials = authorization.slice(6);
    const credentials = atob(base64Credentials);
    const colonIndex = credentials.indexOf(":");

    if (colonIndex === -1) {
      return null;
    }

    const email = credentials.substring(0, colonIndex);
    const apiKeyValue = credentials.substring(colonIndex + 1);

    if (!email || !apiKeyValue) {
      return null;
    }

    // Validate the API key
    const apiKey = await validateApiKey(database, apiKeyValue);

    if (!apiKey) {
      return null;
    }

    // Verify the email matches the user who owns the key
    const user = await findUserByEmail(database, email).catch(() => null);

    if (!user || user.id.toString() !== apiKey.user_id.toString()) {
      return null;
    }

    // Update last used timestamp
    const clientIp = extractClientIp(request);
    await updateApiKeyLastUsed(database, apiKey.id.toString(), clientIp);

    return {
      userId: user.id.toString(),
      method: "basic",
      scopes: apiKey.scopes,
      apiKey,
    };
  } catch {
    return null;
  }
}

/**
 * Authenticate using OAuth Bearer token.
 */
async function authenticateBearerToken(
  authorization: string,
  database: Database,
): Promise<ApiAuthResult | null> {
  try {
    const token = authorization.slice(7); // Remove "Bearer "

    const accessToken = await loadAccessToken(database, token).catch(
      () => null,
    );

    if (!accessToken) {
      return null;
    }

    // Check if token is revoked
    if (accessToken.revoked_at !== null) {
      return null;
    }

    // Check if token is expired
    if (new Date(accessToken.expires_at) <= new Date()) {
      return null;
    }

    // Must have a user_id for API access
    if (!accessToken.user_id) {
      return null;
    }

    return {
      userId: accessToken.user_id.toString(),
      method: "bearer",
      scopes: accessToken.scopes,
      clientId: accessToken.client_id,
    };
  } catch {
    return null;
  }
}

/**
 * Authenticate using session cookie (JWT).
 * Session auth grants full access (no scope restrictions).
 */
function authenticateSession(cookies: Cookies): ApiAuthResult | null {
  const userId = resolveUserId(cookies);

  if (!userId) {
    return null;
  }

  return {
    userId,
    method: "session",
    scopes: null, // Session = full access
  };
}

/**
 * Check if the auth result has the required scope.
 * Session auth (scopes = null) always has access.
 */
export function hasRequiredScope(
  auth: ApiAuthResult,
  requiredScope: ScopeName,
): boolean {
  // Session auth = full access
  if (auth.scopes === null) {
    return true;
  }

  // Import scope checking dynamically to avoid circular deps
  const { satisfiesScope } = require("@colibri-hq/sdk/scopes");
  return satisfiesScope(auth.scopes, requiredScope);
}

/**
 * Extract client IP from request headers.
 * Checks common proxy headers in order of preference.
 */
function extractClientIp(request: Request): string | null {
  // Try x-forwarded-for (may contain multiple IPs, first is client)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  // Try x-real-ip
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  // Try Cloudflare header
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  return null;
}
