import type { AuthorizationServerMetadata, TokenPayload } from "../types.js";
import type {
  Fetch,
  IntrospectionResponse,
  OAuthClientConfig,
  OAuthErrorResponse,
  StoredTokens,
  TokenStore,
} from "./types.js";
import {
  discoverServer,
  getIntrospectionEndpoint,
  getRevocationEndpoint,
  getTokenEndpoint,
} from "./discovery.js";
import { ConfigurationError, NetworkError, OAuthClientError, TokenExpiredError } from "./errors.js";
import { MemoryTokenStore } from "./storage/memory.js";

/**
 * Abstract base class for OAuth clients
 *
 * Provides common functionality for all OAuth flows including:
 * - Server metadata discovery
 * - Token management (storage, refresh, revocation)
 * - Token introspection
 * - HTTP request handling
 *
 * Subclasses implement specific grant type flows.
 */
export abstract class OAuthClientBase {
  readonly #issuer: URL;
  readonly #clientId: string;
  readonly #clientSecret: string | undefined;
  readonly #scopes: string[];
  readonly #fetch: Fetch;
  readonly #tokenStore: TokenStore;
  readonly #useDiscovery: boolean;

  #serverMetadata: AuthorizationServerMetadata | null;
  #discoveryPromise: Promise<AuthorizationServerMetadata> | null = null;

  protected constructor(config: OAuthClientConfig) {
    // Validate required fields
    if (!config.issuer) {
      throw new ConfigurationError("issuer is required");
    }

    if (!config.clientId) {
      throw new ConfigurationError("clientId is required");
    }

    this.#issuer = typeof config.issuer === "string" ? new URL(config.issuer) : config.issuer;
    this.#clientId = config.clientId;
    this.#clientSecret = config.clientSecret;
    this.#scopes = config.scopes ?? [];
    this.#fetch = config.fetch ?? globalThis.fetch.bind(globalThis);
    this.#tokenStore = config.tokenStore ?? new MemoryTokenStore();
    this.#useDiscovery = config.useDiscovery ?? true;
    this.#serverMetadata = config.serverMetadata ?? null;
  }

  // region Getters

  /**
   * The OAuth issuer URL
   */
  get issuer(): URL {
    return this.#issuer;
  }

  /**
   * The OAuth client identifier
   */
  get clientId(): string {
    return this.#clientId;
  }

  /**
   * The OAuth client secret (if configured)
   */
  protected get clientSecret(): string | undefined {
    return this.#clientSecret;
  }

  /**
   * The default scopes to request
   */
  protected get defaultScopes(): string[] {
    return this.#scopes;
  }

  /**
   * The fetch function to use for HTTP requests
   */
  protected get fetch(): Fetch {
    return this.#fetch;
  }

  /**
   * The token store for persisting tokens
   */
  protected get tokenStore(): TokenStore {
    return this.#tokenStore;
  }

  // endregion

  // region Discovery

  /**
   * Discover server metadata from .well-known endpoint
   *
   * Results are cached after the first successful discovery.
   *
   * @returns The authorization server metadata
   * @throws {DiscoveryError} If discovery fails
   * @see RFC 8414
   */
  async discover(): Promise<AuthorizationServerMetadata> {
    // Return cached metadata if available
    if (this.#serverMetadata) {
      return this.#serverMetadata;
    }

    // Deduplicate concurrent discovery requests
    if (this.#discoveryPromise) {
      return this.#discoveryPromise;
    }

    this.#discoveryPromise = discoverServer(this.#issuer, { fetch: this.#fetch });

    try {
      this.#serverMetadata = await this.#discoveryPromise;
      return this.#serverMetadata;
    } finally {
      this.#discoveryPromise = null;
    }
  }

  /**
   * Get server metadata, either from cache or via discovery
   *
   * @internal
   */
  protected async getServerMetadata(): Promise<AuthorizationServerMetadata> {
    if (this.#serverMetadata) {
      return this.#serverMetadata;
    }

    if (!this.#useDiscovery) {
      throw new ConfigurationError(
        "Server metadata is not available and discovery is disabled. " +
          "Either enable discovery or provide serverMetadata in the configuration.",
      );
    }

    return this.discover();
  }

  // endregion

  // region Token Management

  /**
   * Get the current access token if available and not expired
   *
   * @returns The access token string, or null if not available
   */
  async getAccessToken(): Promise<string | null> {
    const tokens = await this.#tokenStore.get(this.#clientId);

    if (!tokens) {
      return null;
    }

    // Check if token is expired
    if (tokens.expiresAt <= new Date()) {
      return null;
    }

    return tokens.accessToken;
  }

  /**
   * Check if the client has valid (non-expired) tokens
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== null;
  }

  /**
   * Get stored tokens
   *
   * @returns The stored tokens, or null if not available
   */
  async getStoredTokens(): Promise<StoredTokens | null> {
    return this.#tokenStore.get(this.#clientId);
  }

  /**
   * Refresh the access token using the refresh token
   *
   * @returns The new token response
   * @throws {InvalidGrantError} If the refresh token is invalid or expired
   */
  async refreshAccessToken(): Promise<TokenPayload> {
    const tokens = await this.#tokenStore.get(this.#clientId);

    if (!tokens?.refreshToken) {
      throw new TokenExpiredError("No refresh token available");
    }

    const metadata = await this.getServerMetadata();
    const tokenEndpoint = getTokenEndpoint(metadata, this.#issuer);

    const params: Record<string, string> = {
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id: this.#clientId,
    };

    if (this.#clientSecret) {
      params.client_secret = this.#clientSecret;
    }

    const response = await this.tokenRequest(tokenEndpoint, params);

    // Store the new tokens
    await this.storeTokens(response);

    return response;
  }

  /**
   * Revoke a token
   *
   * @param token The token to revoke (access or refresh token)
   * @param tokenTypeHint Optional hint about the token type
   * @see RFC 7009
   */
  async revokeToken(
    token: string,
    tokenTypeHint?: "access_token" | "refresh_token",
  ): Promise<void> {
    const metadata = await this.getServerMetadata();
    const revocationEndpoint = getRevocationEndpoint(metadata, this.#issuer);

    if (!revocationEndpoint) {
      throw new ConfigurationError("Server does not support token revocation");
    }

    const params: Record<string, string> = { token, client_id: this.#clientId };

    if (tokenTypeHint) {
      params.token_type_hint = tokenTypeHint;
    }

    if (this.#clientSecret) {
      params.client_secret = this.#clientSecret;
    }

    await this.request(revocationEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });
  }

  /**
   * Introspect a token to check its validity and metadata
   *
   * @param token The token to introspect
   * @returns The introspection response
   * @see RFC 7662
   */
  async introspect(token: string): Promise<IntrospectionResponse> {
    const metadata = await this.getServerMetadata();
    const introspectionEndpoint = getIntrospectionEndpoint(metadata, this.#issuer);

    if (!introspectionEndpoint) {
      throw new ConfigurationError("Server does not support token introspection");
    }

    const params: Record<string, string> = { token, client_id: this.#clientId };

    if (this.#clientSecret) {
      params.client_secret = this.#clientSecret;
    }

    return await this.request<IntrospectionResponse>(introspectionEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams(params).toString(),
    });
  }

  /**
   * Clear all stored tokens and logout
   */
  async logout(): Promise<void> {
    // Optionally revoke tokens before clearing
    const tokens = await this.#tokenStore.get(this.#clientId);

    if (tokens) {
      try {
        // Try to revoke refresh token first (more important)
        if (tokens.refreshToken) {
          await this.revokeToken(tokens.refreshToken, "refresh_token");
        }
        await this.revokeToken(tokens.accessToken, "access_token");
      } catch {
        // Ignore revocation errors during logout
      }
    }

    await this.#tokenStore.clear(this.#clientId);
  }

  // endregion

  // region HTTP Helpers

  /**
   * Make an HTTP request and parse the JSON response
   *
   * @param endpoint The endpoint URL
   * @param init Request options
   * @returns The parsed JSON response
   * @throws {NetworkError} If the request fails
   * @throws {OAuthClientError} If the server returns an OAuth error
   */
  protected async request<T>(endpoint: string | URL, init?: RequestInit): Promise<T> {
    let response: Response;

    try {
      response = await this.#fetch(endpoint.toString(), init);
    } catch (error) {
      throw new NetworkError(`Request to ${endpoint} failed`, { cause: error });
    }

    // Handle error responses
    if (!response.ok) {
      // Try to parse as OAuth error
      try {
        const errorBody = (await response.json()) as OAuthErrorResponse;

        if (errorBody.error) {
          throw OAuthClientError.fromResponse(errorBody, { cause: response });
        }
      } catch (parseError) {
        // If it's already an OAuthClientError, rethrow it
        if (parseError instanceof OAuthClientError) {
          throw parseError;
        }
      }

      // Generic HTTP error
      throw new NetworkError(`Request to ${endpoint} failed with status ${response.status}`, {
        cause: response,
      });
    }

    // Handle empty responses (e.g., revocation endpoint)
    const contentType = response.headers.get("Content-Type");
    if (!contentType?.includes("application/json")) {
      return undefined as T;
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new NetworkError(`Failed to parse response from ${endpoint}`, { cause: error });
    }
  }

  /**
   * Make a token request to the token endpoint
   *
   * @param endpoint The token endpoint URL
   * @param params The token request parameters
   * @returns The token response
   * @throws {OAuthClientError} If the token request fails
   */
  protected async tokenRequest(
    endpoint: URL,
    params: Record<string, string>,
  ): Promise<TokenPayload> {
    return await this.request<TokenPayload>(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams(params).toString(),
    });
  }

  /**
   * Store tokens in the token store
   *
   * @param response The token response from the server
   */
  protected async storeTokens(response: TokenPayload): Promise<void> {
    const expiresAt = new Date(Date.now() + response.expires_in * 1000);

    const tokens: StoredTokens = {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      idToken: response.id_token,
      expiresAt,
      scopes: response.scope ? response.scope.split(" ") : [],
      tokenType: response.token_type,
    };

    await this.#tokenStore.set(this.#clientId, tokens);
  }

  // endregion
}
