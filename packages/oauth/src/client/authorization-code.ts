import type { PkceCodeChallengeMethod, TokenPayload } from "../types.js";
import type {
  AuthorizationCodeClientConfig,
  AuthorizationUrlOptions,
  AuthorizationUrlResult,
  PARResult,
} from "./types.js";
import { OAuthClientBase } from "./base.js";
import {
  ConfigurationError,
  IssuerMismatchError,
  OAuthClientError,
  StateMismatchError,
} from "./errors.js";
import {
  getAuthorizationEndpoint,
  getPushedAuthorizationRequestEndpoint,
  getTokenEndpoint,
  requiresPAR,
  supportsCodeChallengeMethod,
} from "./discovery.js";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateNonce,
  generateState,
} from "./pkce.js";

/**
 * OAuth 2.0 Authorization Code client with PKCE support
 *
 * Implements the Authorization Code flow with PKCE as defined in:
 * - RFC 6749 (OAuth 2.0)
 * - RFC 7636 (PKCE)
 * - RFC 9126 (PAR)
 * - RFC 9207 (Issuer Identification)
 *
 * @example
 * ```typescript
 * const client = new AuthorizationCodeClient({
 *   issuer: "https://auth.example.com",
 *   clientId: "my-app",
 *   redirectUri: "https://app.example.com/callback",
 * });
 *
 * // Step 1: Create authorization URL
 * const { url, codeVerifier, state } = await client.createAuthorizationUrl();
 *
 * // Step 2: Store codeVerifier and state, then redirect user to url
 * sessionStorage.setItem("pkce_verifier", codeVerifier);
 * sessionStorage.setItem("oauth_state", state);
 * window.location.href = url.toString();
 *
 * // Step 3: Handle callback
 * const codeVerifier = sessionStorage.getItem("pkce_verifier");
 * const state = sessionStorage.getItem("oauth_state");
 * const tokens = await client.handleCallback(window.location.href, codeVerifier, state);
 * ```
 */
export class AuthorizationCodeClient extends OAuthClientBase {
  readonly #redirectUri: string;
  readonly #codeChallengeMethod: PkceCodeChallengeMethod;
  readonly #usePAR: boolean;

  constructor(config: AuthorizationCodeClientConfig) {
    super(config);

    if (!config.redirectUri) {
      throw new ConfigurationError("redirectUri is required for authorization code flow");
    }

    this.#redirectUri = config.redirectUri;
    this.#codeChallengeMethod = config.codeChallengeMethod ?? "S256";
    this.#usePAR = config.usePAR ?? false;
  }

  /**
   * Create an authorization URL with PKCE
   *
   * Generates a secure authorization URL with:
   * - PKCE code challenge (S256 by default)
   * - Random state parameter for CSRF protection
   * - Optional nonce for OpenID Connect
   *
   * @param options Authorization URL options
   * @returns The authorization URL and PKCE parameters to store
   */
  async createAuthorizationUrl(
    options: AuthorizationUrlOptions = {},
  ): Promise<AuthorizationUrlResult> {
    const metadata = await this.getServerMetadata();

    // Check if server requires PAR
    if (requiresPAR(metadata) && !this.#usePAR) {
      throw new ConfigurationError(
        "Server requires Pushed Authorization Requests (PAR). " +
          "Enable PAR in the client configuration or use pushAuthorizationRequest().",
      );
    }

    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(
      codeVerifier,
      this.#codeChallengeMethod,
    );

    // Generate state and optional nonce
    const state = options.state ?? generateState();
    const nonce = options.nonce ?? (options.scopes?.includes("openid") ? generateNonce() : undefined);

    // Build authorization URL
    const authorizationEndpoint = getAuthorizationEndpoint(metadata, this.issuer);
    const url = new URL(authorizationEndpoint);

    // Required parameters
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", this.#redirectUri);
    url.searchParams.set("state", state);

    // Scopes
    const scopes = options.scopes ?? this.defaultScopes;
    if (scopes.length > 0) {
      url.searchParams.set("scope", scopes.join(" "));
    }

    // PKCE parameters
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", this.#codeChallengeMethod);

    // OpenID Connect nonce
    if (nonce) {
      url.searchParams.set("nonce", nonce);
    }

    // Additional custom parameters
    if (options.additionalParams) {
      for (const [key, value] of Object.entries(options.additionalParams)) {
        url.searchParams.set(key, value);
      }
    }

    return {
      url,
      codeVerifier,
      state,
      nonce,
    };
  }

  /**
   * Push authorization request (PAR) and get authorization URL
   *
   * Sends authorization parameters to the PAR endpoint first, then returns
   * an authorization URL with only the request_uri parameter.
   *
   * This provides additional security by:
   * - Keeping authorization parameters confidential
   * - Ensuring parameters cannot be tampered with
   * - Reducing URL length
   *
   * @param options Authorization URL options
   * @returns The PAR result including request URI and authorization URL
   * @see RFC 9126
   */
  async pushAuthorizationRequest(
    options: AuthorizationUrlOptions = {},
  ): Promise<PARResult> {
    const metadata = await this.getServerMetadata();
    const parEndpoint = getPushedAuthorizationRequestEndpoint(metadata, this.issuer);

    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(
      codeVerifier,
      this.#codeChallengeMethod,
    );

    // Generate state and optional nonce
    const state = options.state ?? generateState();
    const nonce = options.nonce ?? (options.scopes?.includes("openid") ? generateNonce() : undefined);

    // Build PAR request parameters
    const params: Record<string, string> = {
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: this.#redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: this.#codeChallengeMethod,
    };

    // Add client secret if configured
    if (this.clientSecret) {
      params.client_secret = this.clientSecret;
    }

    // Scopes
    const scopes = options.scopes ?? this.defaultScopes;
    if (scopes.length > 0) {
      params.scope = scopes.join(" ");
    }

    // OpenID Connect nonce
    if (nonce) {
      params.nonce = nonce;
    }

    // Additional custom parameters
    if (options.additionalParams) {
      Object.assign(params, options.additionalParams);
    }

    // Send PAR request
    const response = await this.request<PARResponse>(parEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams(params).toString(),
    });

    // Build authorization URL with request_uri
    const authorizationEndpoint = getAuthorizationEndpoint(metadata, this.issuer);
    const url = new URL(authorizationEndpoint);
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("request_uri", response.request_uri);

    return {
      requestUri: response.request_uri,
      expiresIn: response.expires_in,
      url,
    };
  }

  /**
   * Exchange an authorization code for tokens
   *
   * @param code The authorization code from the callback
   * @param codeVerifier The PKCE code verifier stored before the authorization request
   * @returns The token response
   * @throws {InvalidGrantError} If the code or verifier is invalid
   */
  async exchangeCode(code: string, codeVerifier: string): Promise<TokenPayload> {
    const metadata = await this.getServerMetadata();
    const tokenEndpoint = getTokenEndpoint(metadata, this.issuer);

    const params: Record<string, string> = {
      grant_type: "authorization_code",
      code,
      redirect_uri: this.#redirectUri,
      client_id: this.clientId,
      code_verifier: codeVerifier,
    };

    if (this.clientSecret) {
      params.client_secret = this.clientSecret;
    }

    const response = await this.tokenRequest(tokenEndpoint, params);

    // Store the tokens
    await this.storeTokens(response);

    return response;
  }

  /**
   * Handle the authorization callback URL
   *
   * Convenience method that extracts the authorization code from the callback URL,
   * validates the state parameter, and exchanges the code for tokens.
   *
   * @param callbackUrl The full callback URL with query parameters
   * @param codeVerifier The PKCE code verifier stored before the authorization request
   * @param expectedState The state parameter stored before the authorization request
   * @returns The token response
   * @throws {StateMismatchError} If the state doesn't match
   * @throws {IssuerMismatchError} If the issuer doesn't match (RFC 9207)
   * @throws {OAuthClientError} If the callback contains an error
   */
  async handleCallback(
    callbackUrl: string | URL,
    codeVerifier: string,
    expectedState?: string,
  ): Promise<TokenPayload> {
    const { code } = this.validateCallback(callbackUrl, expectedState);
    return this.exchangeCode(code, codeVerifier);
  }

  /**
   * Validate the authorization callback URL
   *
   * Extracts and validates parameters from the callback URL without
   * exchanging the code for tokens.
   *
   * @param callbackUrl The full callback URL with query parameters
   * @param expectedState The state parameter stored before the authorization request
   * @returns The extracted parameters
   * @throws {StateMismatchError} If the state doesn't match
   * @throws {IssuerMismatchError} If the issuer doesn't match (RFC 9207)
   * @throws {OAuthClientError} If the callback contains an error
   */
  validateCallback(
    callbackUrl: string | URL,
    expectedState?: string,
  ): { code: string; state?: string; iss?: string } {
    const url = typeof callbackUrl === "string" ? new URL(callbackUrl) : callbackUrl;

    // Check for error response
    const error = url.searchParams.get("error");
    if (error) {
      throw OAuthClientError.fromResponse({
        error,
        error_description: url.searchParams.get("error_description") ?? undefined,
        error_uri: url.searchParams.get("error_uri") ?? undefined,
      });
    }

    // Extract and validate state
    const state = url.searchParams.get("state") ?? undefined;
    if (expectedState && state !== expectedState) {
      throw new StateMismatchError();
    }

    // Validate issuer (RFC 9207)
    const iss = url.searchParams.get("iss") ?? undefined;
    if (iss) {
      const expectedIssuer = this.issuer.toString().replace(/\/$/, "");
      const receivedIssuer = iss.replace(/\/$/, "");
      if (receivedIssuer !== expectedIssuer) {
        throw new IssuerMismatchError(expectedIssuer, receivedIssuer);
      }
    }

    // Extract authorization code
    const code = url.searchParams.get("code");
    if (!code) {
      throw new OAuthClientError(
        "invalid_request",
        "Missing authorization code in callback URL",
      );
    }

    return {
      code,
      ...(state !== undefined && { state }),
      ...(iss !== undefined && { iss }),
    };
  }

  /**
   * Check if PKCE with the configured challenge method is supported
   */
  async isPKCESupported(): Promise<boolean> {
    const metadata = await this.getServerMetadata();
    return supportsCodeChallengeMethod(metadata, this.#codeChallengeMethod);
  }
}

/**
 * PAR response
 */
interface PARResponse {
  request_uri: string;
  expires_in: number;
}
