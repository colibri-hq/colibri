import type {
  AuthorizationServerMetadata,
  OAuthGrantType,
  PkceCodeChallengeMethod,
} from "../types.js";
import type { Fetch } from "./types.js";
import { DiscoveryError, NetworkError } from "./errors.js";

/**
 * Well-known path for OAuth Authorization Server Metadata
 * @see RFC 8414
 */
const OAUTH_METADATA_PATH = "/.well-known/oauth-authorization-server";

/**
 * Well-known path for OpenID Connect Discovery
 * @see OpenID Connect Discovery 1.0
 */
const OPENID_METADATA_PATH = "/.well-known/openid-configuration";

/**
 * Options for server metadata discovery
 */
export interface DiscoveryOptions {
  /**
   * Custom fetch implementation
   */
  fetch?: Fetch | undefined;

  /**
   * Try OpenID Connect discovery if OAuth discovery fails
   * @default true
   */
  fallbackToOpenId?: boolean | undefined;

  /**
   * Request timeout in milliseconds
   * @default 10000
   */
  timeout?: number | undefined;
}

/**
 * Discover OAuth Authorization Server Metadata
 *
 * Fetches the server metadata from the `.well-known` endpoint as per RFC 8414.
 * If OAuth discovery fails and `fallbackToOpenId` is true, it will attempt
 * OpenID Connect discovery.
 *
 * @param issuer The issuer URL (e.g., 'https://auth.example.com')
 * @param options Discovery options
 * @returns The authorization server metadata
 * @throws {DiscoveryError} If discovery fails
 * @see RFC 8414
 */
export async function discoverServer(
  issuer: string | URL,
  options: DiscoveryOptions = {},
): Promise<AuthorizationServerMetadata> {
  const {
    fetch: customFetch = globalThis.fetch,
    fallbackToOpenId = true,
    timeout = 10000,
  } = options;

  const issuerUrl = new URL(issuer);

  // Normalize issuer URL (remove trailing slash)
  const normalizedIssuer = issuerUrl.origin + issuerUrl.pathname.replace(/\/$/, "");

  // Try OAuth 2.0 Authorization Server Metadata first (RFC 8414)
  const oauthUrl = new URL(OAUTH_METADATA_PATH, normalizedIssuer);

  try {
    return await fetchMetadata(oauthUrl, normalizedIssuer, customFetch, timeout);
  } catch (oauthError) {
    // If OAuth discovery fails and fallback is enabled, try OpenID Connect discovery
    if (fallbackToOpenId) {
      const openIdUrl = new URL(OPENID_METADATA_PATH, normalizedIssuer);

      try {
        return await fetchMetadata(openIdUrl, normalizedIssuer, customFetch, timeout);
      } catch {
        // Both failed, throw a combined error
        throw new DiscoveryError(
          `Failed to discover server metadata from both OAuth (${OAUTH_METADATA_PATH}) and OpenID Connect (${OPENID_METADATA_PATH}) endpoints`,
          { cause: oauthError },
        );
      }
    }

    throw oauthError;
  }
}

/**
 * Fetch and validate server metadata from a URL
 */
async function fetchMetadata(
  url: URL,
  expectedIssuer: string,
  fetchFn: Fetch,
  timeout: number,
): Promise<AuthorizationServerMetadata> {
  let response: Response;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    response = await fetchFn(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new DiscoveryError(`Request to ${url} timed out after ${timeout}ms`, { cause: error });
    }

    throw new NetworkError(`Failed to fetch server metadata from ${url}`, { cause: error });
  }

  if (!response.ok) {
    throw new DiscoveryError(
      `Server returned ${response.status} ${response.statusText} for ${url}`,
    );
  }

  let metadata: AuthorizationServerMetadata;

  try {
    metadata = (await response.json()) as AuthorizationServerMetadata;
  } catch (error) {
    throw new DiscoveryError(`Invalid JSON response from ${url}`, { cause: error });
  }

  // Validate required fields
  validateMetadata(metadata, expectedIssuer);

  return metadata;
}

/**
 * Validate server metadata
 */
function validateMetadata(metadata: AuthorizationServerMetadata, expectedIssuer: string): void {
  // Validate issuer (must match exactly per RFC 8414 Section 3.3)
  const metadataIssuer =
    typeof metadata.issuer === "string" ? metadata.issuer : metadata.issuer?.toString();

  if (!metadataIssuer) {
    throw new DiscoveryError("Server metadata is missing required 'issuer' field");
  }

  // Normalize for comparison
  const normalizedMetadataIssuer = metadataIssuer.replace(/\/$/, "");
  const normalizedExpectedIssuer = expectedIssuer.replace(/\/$/, "");

  if (normalizedMetadataIssuer !== normalizedExpectedIssuer) {
    throw new DiscoveryError(
      `Issuer mismatch: expected "${normalizedExpectedIssuer}", got "${normalizedMetadataIssuer}"`,
    );
  }

  // Validate required token_endpoint
  if (!metadata.token_endpoint) {
    throw new DiscoveryError("Server metadata is missing required 'token_endpoint' field");
  }

  // Validate required response_types_supported
  if (!metadata.response_types_supported || !Array.isArray(metadata.response_types_supported)) {
    throw new DiscoveryError(
      "Server metadata is missing required 'response_types_supported' field",
    );
  }
}

/**
 * Build an endpoint URL from server metadata
 *
 * If the endpoint is already an absolute URL, it is returned as-is.
 * If it's a relative path, it's resolved against the issuer.
 *
 * @param endpoint The endpoint URL or path from metadata
 * @param issuer The issuer URL to resolve relative paths against
 * @returns The absolute endpoint URL
 */
export function resolveEndpoint(
  endpoint: string | URL | undefined,
  issuer: string | URL,
): URL | undefined {
  if (!endpoint) {
    return undefined;
  }

  const endpointStr = typeof endpoint === "string" ? endpoint : endpoint.toString();

  // If it's already an absolute URL, use it directly
  if (endpointStr.startsWith("http://") || endpointStr.startsWith("https://")) {
    return new URL(endpointStr);
  }

  // Otherwise, resolve against issuer
  return new URL(endpointStr, issuer);
}

/**
 * Get the authorization endpoint URL from server metadata
 */
export function getAuthorizationEndpoint(
  metadata: AuthorizationServerMetadata,
  issuer: string | URL,
): URL {
  const endpoint = resolveEndpoint(metadata.authorization_endpoint, issuer);

  if (!endpoint) {
    throw new DiscoveryError("Server metadata does not include an authorization endpoint");
  }

  return endpoint;
}

/**
 * Get the token endpoint URL from server metadata
 */
export function getTokenEndpoint(metadata: AuthorizationServerMetadata, issuer: string | URL): URL {
  const endpoint = resolveEndpoint(metadata.token_endpoint, issuer);

  if (!endpoint) {
    throw new DiscoveryError("Server metadata does not include a token endpoint");
  }

  return endpoint;
}

/**
 * Get the device authorization endpoint URL from server metadata
 */
export function getDeviceAuthorizationEndpoint(
  metadata: AuthorizationServerMetadata,
  issuer: string | URL,
): URL {
  const endpoint = resolveEndpoint(metadata.device_authorization_endpoint, issuer);

  if (!endpoint) {
    throw new DiscoveryError("Server metadata does not include a device authorization endpoint");
  }

  return endpoint;
}

/**
 * Get the PAR endpoint URL from server metadata
 */
export function getPushedAuthorizationRequestEndpoint(
  metadata: AuthorizationServerMetadata,
  issuer: string | URL,
): URL {
  const endpoint = resolveEndpoint(metadata.pushed_authorization_request_endpoint, issuer);

  if (!endpoint) {
    throw new DiscoveryError(
      "Server metadata does not include a pushed authorization request endpoint",
    );
  }

  return endpoint;
}

/**
 * Get the revocation endpoint URL from server metadata
 */
export function getRevocationEndpoint(
  metadata: AuthorizationServerMetadata,
  issuer: string | URL,
): URL | undefined {
  return resolveEndpoint(metadata.revocation_endpoint, issuer);
}

/**
 * Get the introspection endpoint URL from server metadata
 */
export function getIntrospectionEndpoint(
  metadata: AuthorizationServerMetadata,
  issuer: string | URL,
): URL | undefined {
  return resolveEndpoint(metadata.introspection_endpoint, issuer);
}

/**
 * Get the userinfo endpoint URL from server metadata
 */
export function getUserInfoEndpoint(
  metadata: AuthorizationServerMetadata,
  issuer: string | URL,
): URL | undefined {
  return resolveEndpoint(metadata.userinfo_endpoint, issuer);
}

/**
 * Check if the server supports a specific grant type
 */
export function supportsGrantType(
  metadata: AuthorizationServerMetadata,
  grantType: string,
): boolean {
  // Default grant types if not specified per RFC 8414
  const supportedGrantTypes = metadata.grant_types_supported ?? ["authorization_code"];
  return supportedGrantTypes.includes(grantType as unknown as OAuthGrantType);
}

/**
 * Check if the server supports a specific PKCE code challenge method
 */
export function supportsCodeChallengeMethod(
  metadata: AuthorizationServerMetadata,
  method: string,
): boolean {
  // If not specified, server doesn't support PKCE
  if (!metadata.code_challenge_methods_supported) {
    return false;
  }

  return metadata.code_challenge_methods_supported.includes(
    method as unknown as PkceCodeChallengeMethod,
  );
}

/**
 * Check if the server requires PAR
 */
export function requiresPAR(metadata: AuthorizationServerMetadata): boolean {
  return metadata.require_pushed_authorization_requests === true;
}
