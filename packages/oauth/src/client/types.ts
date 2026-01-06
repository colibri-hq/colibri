import type {
  AuthorizationServerMetadata,
  OAuthErrorCode,
  PkceCodeChallengeMethod,
  TokenPayload,
} from "../types.js";

// region Fetch Type
export type Fetch = typeof globalThis.fetch;
// endregion

// region Token Storage

/**
 * Stored tokens with expiration metadata
 */
export interface StoredTokens {
  /**
   * The access token
   */
  accessToken: string;

  /**
   * The refresh token, if available
   */
  refreshToken?: string | undefined;

  /**
   * The ID token (OpenID Connect), if available
   */
  idToken?: string | undefined;

  /**
   * When the access token expires
   */
  expiresAt: Date;

  /**
   * The scopes granted to the access token
   */
  scopes: string[];

  /**
   * The token type (usually "Bearer")
   */
  tokenType: string;
}

/**
 * Token storage interface for persisting tokens
 *
 * Implementations can store tokens in memory, localStorage, secure storage, etc.
 */
export interface TokenStore {
  /**
   * Get stored tokens for a client
   * @param clientId The client identifier
   */
  get(clientId: string): Promise<StoredTokens | null>;

  /**
   * Store tokens for a client
   * @param clientId The client identifier
   * @param tokens The tokens to store
   */
  set(clientId: string, tokens: StoredTokens): Promise<void>;

  /**
   * Clear tokens for a specific client
   * @param clientId The client identifier
   */
  clear(clientId: string): Promise<void>;

  /**
   * Clear all stored tokens
   */
  clearAll(): Promise<void>;
}

// endregion

// region Client Configuration

/**
 * Base configuration for all OAuth clients
 */
export interface OAuthClientConfig {
  /**
   * The OAuth issuer URL (e.g., 'https://auth.example.com')
   *
   * Used as the base URL for all OAuth endpoints and for server metadata discovery.
   */
  issuer: string | URL;

  /**
   * OAuth client identifier
   */
  clientId: string;

  /**
   * OAuth client secret (for confidential clients)
   *
   * Required for client credentials flow and optional for other flows
   * depending on the client type (public vs confidential).
   */
  clientSecret?: string | undefined;

  /**
   * Default scopes to request
   *
   * These scopes will be included in all authorization requests unless
   * explicitly overridden.
   */
  scopes?: string[] | undefined;

  /**
   * Custom fetch implementation
   *
   * Defaults to `globalThis.fetch`. Useful for testing or adding
   * custom middleware (logging, retry logic, etc.).
   */
  fetch?: Fetch | undefined;

  /**
   * Token storage implementation
   *
   * Defaults to `MemoryTokenStore`. For browser applications,
   * consider using `LocalStorageTokenStore` or `SecureTokenStore`.
   */
  tokenStore?: TokenStore | undefined;

  /**
   * Whether to auto-discover server metadata from .well-known endpoint
   *
   * @default true
   * @see RFC 8414
   */
  useDiscovery?: boolean | undefined;

  /**
   * Custom server metadata (skips discovery)
   *
   * Useful when the server metadata is known ahead of time or when
   * the server doesn't support metadata discovery.
   */
  serverMetadata?: AuthorizationServerMetadata | undefined;
}

/**
 * Configuration for Authorization Code flow clients
 */
export interface AuthorizationCodeClientConfig extends OAuthClientConfig {
  /**
   * OAuth redirect URI for authorization callback
   *
   * This must match one of the redirect URIs registered with the
   * authorization server.
   */
  redirectUri: string;

  /**
   * PKCE code challenge method
   *
   * @default 'S256'
   * @see RFC 7636
   */
  codeChallengeMethod?: PkceCodeChallengeMethod | undefined;

  /**
   * Whether to use Pushed Authorization Requests (PAR)
   *
   * When enabled, authorization parameters are sent to the PAR endpoint
   * first, and only a request URI is included in the authorization URL.
   *
   * @default false
   * @see RFC 9126
   */
  usePAR?: boolean | undefined;
}

/**
 * Configuration for Client Credentials flow clients
 */
export interface ClientCredentialsClientConfig extends OAuthClientConfig {
  /**
   * Client secret (required for this flow)
   */
  clientSecret: string;

  /**
   * Automatically refresh token when expired
   *
   * @default true
   */
  autoRefresh?: boolean | undefined;

  /**
   * Buffer time before expiry to trigger refresh (seconds)
   *
   * The client will proactively refresh the token this many seconds
   * before it actually expires.
   *
   * @default 60
   */
  refreshBuffer?: number | undefined;
}

/**
 * Configuration for Device Authorization flow clients
 */
export interface DeviceAuthorizationClientConfig extends OAuthClientConfig {
  /**
   * Callback when polling is pending (user hasn't completed authorization yet)
   */
  onPending?: (() => void) | undefined;

  /**
   * Callback when slow_down response is received
   * @param newInterval The new polling interval in seconds
   */
  onSlowDown?: ((newInterval: number) => void) | undefined;

  /**
   * Maximum polling duration (seconds)
   *
   * @default 300
   */
  pollingTimeout?: number | undefined;
}

// endregion

// region Request/Response Types

/**
 * Options for creating an authorization URL
 */
export interface AuthorizationUrlOptions {
  /**
   * Custom state parameter (auto-generated if omitted)
   *
   * Used for CSRF protection. Must be validated when handling the callback.
   */
  state?: string | undefined;

  /**
   * OpenID Connect nonce
   *
   * Required when requesting the `openid` scope. Used to mitigate replay attacks.
   */
  nonce?: string | undefined;

  /**
   * Override default scopes for this request
   */
  scopes?: string[] | undefined;

  /**
   * Additional authorization parameters
   *
   * Custom parameters to include in the authorization request (e.g., `login_hint`, `prompt`).
   */
  additionalParams?: Record<string, string> | undefined;
}

/**
 * Result from creating an authorization URL
 */
export interface AuthorizationUrlResult {
  /**
   * The authorization URL to redirect the user to
   */
  url: URL;

  /**
   * PKCE code verifier
   *
   * This must be stored securely (e.g., in session storage) and provided
   * when exchanging the authorization code for tokens.
   */
  codeVerifier: string;

  /**
   * State parameter for CSRF protection
   *
   * This should be stored and validated when handling the callback.
   */
  state: string;

  /**
   * OpenID Connect nonce (if requested)
   */
  nonce?: string | undefined;
}

/**
 * Result from a Pushed Authorization Request
 */
export interface PARResult {
  /**
   * The request URI to use in the authorization URL
   */
  requestUri: string;

  /**
   * How long the request URI is valid (seconds)
   */
  expiresIn: number;

  /**
   * The authorization URL with the request_uri parameter
   */
  url: URL;
}

/**
 * Device authorization response
 *
 * @see RFC 8628, Section 3.2
 */
export interface DeviceAuthorizationResponse {
  /**
   * The device verification code
   */
  deviceCode: string;

  /**
   * The end-user verification code
   */
  userCode: string;

  /**
   * The verification URI to display to the user
   */
  verificationUri: string;

  /**
   * The verification URI with user code embedded (optional)
   *
   * If provided, users can navigate directly to this URL instead of
   * entering the user code manually.
   */
  verificationUriComplete?: string | undefined;

  /**
   * Lifetime of the device code (seconds)
   */
  expiresIn: number;

  /**
   * Minimum polling interval (seconds)
   */
  interval: number;
}

/**
 * Options for polling for device authorization token
 */
export interface PollOptions {
  /**
   * Abort signal for cancellation
   */
  signal?: AbortSignal | undefined;

  /**
   * Callback on each poll attempt
   * @param attempt The current attempt number (1-indexed)
   */
  onPoll?: ((attempt: number) => void) | undefined;
}

/**
 * Token introspection response
 *
 * @see RFC 7662, Section 2.2
 */
export interface IntrospectionResponse {
  /**
   * Whether the token is active
   */
  active: boolean;

  /**
   * The scope of the token
   */
  scope?: string | undefined;

  /**
   * Client identifier the token was issued to
   */
  client_id?: string | undefined;

  /**
   * Username of the resource owner
   */
  username?: string | undefined;

  /**
   * Token type (e.g., "Bearer")
   */
  token_type?: string | undefined;

  /**
   * Token expiration timestamp (Unix epoch seconds)
   */
  exp?: number | undefined;

  /**
   * Token issued at timestamp (Unix epoch seconds)
   */
  iat?: number | undefined;

  /**
   * Token not before timestamp (Unix epoch seconds)
   */
  nbf?: number | undefined;

  /**
   * Subject (user) identifier
   */
  sub?: string | undefined;

  /**
   * Intended audience
   */
  aud?: string | string[] | undefined;

  /**
   * Issuer identifier
   */
  iss?: string | undefined;

  /**
   * JWT ID
   */
  jti?: string | undefined;
}

/**
 * OAuth error response from server
 */
export interface OAuthErrorResponse {
  /**
   * OAuth error code
   */
  error: OAuthErrorCode | string;

  /**
   * Human-readable error description
   */
  error_description?: string | undefined;

  /**
   * URI with more information about the error
   */
  error_uri?: string | undefined;
}

// endregion

// region Re-exports for convenience

export type { AuthorizationServerMetadata, TokenPayload, OAuthErrorCode };

// endregion
