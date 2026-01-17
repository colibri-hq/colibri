import type { OAuthErrorCode, OAuthErrorResponse } from "./types.js";

/**
 * HTTP status codes for OAuth error codes
 */
const statusMap: Partial<Record<OAuthErrorCode | string, number>> = {
  invalid_request: 400,
  invalid_scope: 400,
  unsupported_response_type: 400,
  unsupported_grant_type: 400,
  slow_down: 400,
  expired_token: 400,
  authorization_pending: 400,
  invalid_client: 401,
  invalid_grant: 403,
  unauthorized_client: 403,
  access_denied: 403,
  server_error: 500,
  temporarily_unavailable: 502,
};

/**
 * Base error class for OAuth client errors
 *
 * Provides structured error information including OAuth error codes,
 * descriptions, and URIs for additional information.
 */
export class OAuthClientError extends Error {
  /**
   * OAuth error code
   */
  readonly code: OAuthErrorCode | string;

  /**
   * Human-readable error description
   */
  readonly description: string | undefined;

  /**
   * URI with more information about the error
   */
  readonly uri: string | undefined;

  /**
   * HTTP status code associated with this error
   */
  readonly statusCode: number;

  constructor(
    code: OAuthErrorCode | string,
    description?: string,
    uri?: string,
    options?: { cause?: unknown },
  ) {
    const message = description ? `${code}: ${description}` : code;
    super(message, options);

    this.code = code;
    this.description = description;
    this.uri = uri;
    this.statusCode = statusMap[code] ?? 400;

    // Maintains proper stack trace for where our error was thrown (only V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OAuthClientError);
    }

    this.name = "OAuthClientError";
  }

  /**
   * Create an OAuthClientError from an OAuth error response
   */
  static fromResponse(
    { error, error_description, error_uri }: OAuthErrorResponse,
    options?: { cause?: unknown },
  ): OAuthClientError {
    return new OAuthClientError(error, error_description, error_uri, options);
  }

  /**
   * Check if an error is an OAuthClientError with a specific code
   */
  static isCode(error: unknown, code: OAuthErrorCode | string): error is OAuthClientError {
    return error instanceof OAuthClientError && error.code === code;
  }

  /**
   * Convert to a plain object for serialization
   */
  toJSON(): OAuthErrorResponse {
    return { error: this.code, error_description: this.description, error_uri: this.uri };
  }
}

/**
 * Error thrown when a token has expired
 */
export class TokenExpiredError extends OAuthClientError {
  constructor(message?: string, options?: { cause?: unknown }) {
    super("expired_token", message ?? "The token has expired", undefined, options);
    this.name = "TokenExpiredError";
  }
}

/**
 * Error thrown when a grant is invalid
 *
 * This can occur when:
 * - Authorization code is invalid, expired, or already used
 * - Refresh token is invalid or expired
 * - PKCE code verifier doesn't match
 */
export class InvalidGrantError extends OAuthClientError {
  constructor(message?: string, options?: { cause?: unknown }) {
    super("invalid_grant", message ?? "The grant is invalid", undefined, options);
    this.name = "InvalidGrantError";
  }
}

/**
 * Error thrown during device authorization polling when authorization is pending
 *
 * This is an expected error during the device flow - the client should continue
 * polling until the user completes authorization or the device code expires.
 */
export class AuthorizationPendingError extends OAuthClientError {
  constructor(options?: { cause?: unknown }) {
    super(
      "authorization_pending",
      "The user has not yet completed authorization",
      undefined,
      options,
    );
    this.name = "AuthorizationPendingError";
  }
}

/**
 * Error thrown when the device flow client is polling too frequently
 *
 * The client should increase the polling interval and retry.
 */
export class SlowDownError extends OAuthClientError {
  /**
   * The new polling interval to use (seconds)
   */
  readonly newInterval: number;

  constructor(currentInterval: number, options?: { cause?: unknown }) {
    // Per RFC 8628, the interval should be increased by 5 seconds
    const newInterval = currentInterval + 5;
    super(
      "slow_down",
      `Polling too frequently, increase interval to ${newInterval} seconds`,
      undefined,
      options,
    );
    this.newInterval = newInterval;
    this.name = "SlowDownError";
  }
}

/**
 * Error thrown when the user denies the authorization request
 */
export class AccessDeniedError extends OAuthClientError {
  constructor(message?: string, options?: { cause?: unknown }) {
    super(
      "access_denied",
      message ?? "The resource owner or authorization server denied the request",
      undefined,
      options,
    );
    this.name = "AccessDeniedError";
  }
}

/**
 * Error thrown when there's a network or connection problem
 */
export class NetworkError extends OAuthClientError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("server_error", message, undefined, options);
    this.name = "NetworkError";
  }
}

/**
 * Error thrown when server metadata discovery fails
 */
export class DiscoveryError extends OAuthClientError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("server_error", `Discovery failed: ${message}`, undefined, options);
    this.name = "DiscoveryError";
  }
}

/**
 * Error thrown when state validation fails during callback handling
 *
 * This typically indicates a CSRF attack or session mismatch.
 */
export class StateMismatchError extends OAuthClientError {
  constructor(options?: { cause?: unknown }) {
    super("invalid_request", "State parameter mismatch - possible CSRF attack", undefined, options);
    this.name = "StateMismatchError";
  }
}

/**
 * Error thrown when the issuer doesn't match during callback handling
 *
 * This can indicate a mix-up attack.
 *
 * @see RFC 9207
 */
export class IssuerMismatchError extends OAuthClientError {
  constructor(expected: string, received: string, options?: { cause?: unknown }) {
    super(
      "invalid_request",
      `Issuer mismatch - expected "${expected}", received "${received}"`,
      undefined,
      options,
    );
    this.name = "IssuerMismatchError";
  }
}

/**
 * Error thrown when polling times out during device authorization
 */
export class PollingTimeoutError extends OAuthClientError {
  constructor(timeoutSeconds: number, options?: { cause?: unknown }) {
    super(
      "expired_token",
      `Device authorization polling timed out after ${timeoutSeconds} seconds`,
      undefined,
      options,
    );
    this.name = "PollingTimeoutError";
  }
}

/**
 * Error thrown when an operation is aborted via AbortSignal
 */
export class AbortError extends OAuthClientError {
  constructor(options?: { cause?: unknown }) {
    super("invalid_request", "Operation was aborted", undefined, options);
    this.name = "AbortError";
  }
}

/**
 * Error thrown when client is not properly configured
 */
export class ConfigurationError extends OAuthClientError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("invalid_request", `Configuration error: ${message}`, undefined, options);
    this.name = "ConfigurationError";
  }
}
