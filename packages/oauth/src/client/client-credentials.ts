import type { TokenPayload } from "../types.js";
import type { ClientCredentialsClientConfig } from "./types.js";
import { OAuthClientBase } from "./base.js";
import { ConfigurationError } from "./errors.js";
import { getTokenEndpoint } from "./discovery.js";

/**
 * Default buffer time before token expiry to trigger refresh (seconds)
 */
const DEFAULT_REFRESH_BUFFER = 60;

/**
 * OAuth 2.0 Client Credentials client for machine-to-machine authentication
 *
 * Implements the Client Credentials flow as defined in RFC 6749 Section 4.4.
 * This flow is used for server-to-server communication where the client
 * itself is the resource owner.
 *
 * Features:
 * - Automatic token caching
 * - Proactive token refresh before expiry
 * - Configurable refresh buffer
 *
 * @example
 * ```typescript
 * const client = new ClientCredentialsClient({
 *   issuer: "https://auth.example.com",
 *   clientId: "service-account",
 *   clientSecret: "secret",
 * });
 *
 * // Get a valid token (automatically cached and refreshed)
 * const token = await client.getValidToken();
 *
 * // Use the token for API calls
 * const response = await fetch("https://api.example.com/data", {
 *   headers: {
 *     Authorization: `Bearer ${token}`,
 *   },
 * });
 * ```
 *
 * @see RFC 6749, Section 4.4
 */
export class ClientCredentialsClient extends OAuthClientBase {
  readonly #autoRefresh: boolean;
  readonly #refreshBuffer: number;

  constructor(config: ClientCredentialsClientConfig) {
    super(config);

    if (!config.clientSecret) {
      throw new ConfigurationError(
        "clientSecret is required for client credentials flow",
      );
    }

    this.#autoRefresh = config.autoRefresh ?? true;
    this.#refreshBuffer = config.refreshBuffer ?? DEFAULT_REFRESH_BUFFER;
  }

  /**
   * Get a valid access token
   *
   * Returns a cached token if available and not expired (or about to expire).
   * If no valid token is cached, requests a new one.
   *
   * The token is proactively refreshed when it's within `refreshBuffer`
   * seconds of expiring to avoid failed requests.
   *
   * @returns The access token string
   */
  async getValidToken(): Promise<string> {
    // Check for cached token
    const stored = await this.getStoredTokens();

    if (stored) {
      const now = Date.now();
      const expiresAt = stored.expiresAt.getTime();
      const bufferMs = this.#refreshBuffer * 1000;

      // Token is valid and not about to expire
      if (expiresAt > now + bufferMs) {
        return stored.accessToken;
      }

      // Token is about to expire or expired
      if (this.#autoRefresh) {
        // Try to refresh using refresh token if available
        if (stored.refreshToken) {
          try {
            const response = await this.refreshAccessToken();
            return response.access_token;
          } catch {
            // Refresh failed, fall through to get new token
          }
        }
      }
    }

    // Get a new token
    const response = await this.getToken();
    return response.access_token;
  }

  /**
   * Request a new access token (ignoring cached tokens)
   *
   * Use this when you need a fresh token regardless of what's cached.
   *
   * @param scopes Optional scopes to request (overrides default scopes)
   * @returns The token response
   */
  async getToken(scopes?: string[]): Promise<TokenPayload> {
    const metadata = await this.getServerMetadata();
    const tokenEndpoint = getTokenEndpoint(metadata, this.issuer);

    const params: Record<string, string> = {
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret!,
    };

    // Add scopes
    const requestedScopes = scopes ?? this.defaultScopes;
    if (requestedScopes.length > 0) {
      params.scope = requestedScopes.join(" ");
    }

    const response = await this.tokenRequest(tokenEndpoint, params);

    // Store the tokens
    await this.storeTokens(response);

    return response;
  }

  /**
   * Check if the token is about to expire
   *
   * @returns True if the token will expire within the refresh buffer
   */
  async isTokenExpiringSoon(): Promise<boolean> {
    const stored = await this.getStoredTokens();

    if (!stored) {
      return true;
    }

    const now = Date.now();
    const expiresAt = stored.expiresAt.getTime();
    const bufferMs = this.#refreshBuffer * 1000;

    return expiresAt <= now + bufferMs;
  }

  /**
   * Get the time until the token expires
   *
   * @returns Seconds until expiration, or 0 if expired or no token
   */
  async getTokenExpiresIn(): Promise<number> {
    const stored = await this.getStoredTokens();

    if (!stored) {
      return 0;
    }

    const now = Date.now();
    const expiresAt = stored.expiresAt.getTime();
    const remaining = Math.max(0, expiresAt - now);

    return Math.floor(remaining / 1000);
  }
}
