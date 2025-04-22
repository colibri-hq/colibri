import type { OAuthErrorCode } from "./types.js";
import { type ZodCustomIssue, ZodError, type ZodIssue } from "zod";
import { jsonResponse, redirectResponse } from "./utilities";

export const statusMap: Record<OAuthErrorCode, number> = {
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

export class OAuthError extends Error {
  public readonly code: OAuthErrorCode;
  public readonly uri: URL | undefined;
  readonly #description: string | ZodError<string> | undefined;

  constructor(
    code: OAuthErrorCode,
    description?: ZodError | string,
    uri?: string | URL,
    options?: { cause?: unknown },
  ) {
    super(code, options);
    this.code = code;
    this.#description = description;
    this.uri = uri ? new URL(uri) : undefined;

    Object.setPrototypeOf(this, OAuthError.prototype);
    this.name = "OAuthError";
  }

  get status() {
    return statusMap[this.code];
  }

  get description() {
    if (!this.#description || typeof this.#description === "string") {
      return this.#description;
    }

    return this.#description.format()._errors.join(", ");
  }

  get response() {
    return jsonResponse(
      {
        error: this.code,
        error_description: this.description,
        error_uri: this.uri?.toString(),
      },
      { status: this.status },
    );
  }

  static fromValidationIssues(
    issues: (ZodIssue | ZodCustomIssue)[],
    options?: { cause: unknown },
  ): OAuthError {
    for (const issue of issues) {
      const { path, message } = issue;

      // Determine the OAuth error code
      const errorCode =
        "params" in issue && issue.params?.oauth_error
          ? issue.params.oauth_error
          : "invalid_request";

      // Handle specific field errors
      if (path.includes("client_id")) {
        if (errorCode === "invalid_request" && message?.includes("missing")) {
          return new OAuthError("invalid_request", message, undefined, options);
        }

        return new OAuthError("invalid_client", message, undefined, options);
      }

      if (path.includes("client_secret")) {
        if (errorCode === "invalid_request" && message?.includes("missing")) {
          return new OAuthError("invalid_request", message, undefined, options);
        }

        return new OAuthError("invalid_client", message, undefined, options);
      }

      if (path.includes("scope")) {
        return new OAuthError("invalid_scope", message, undefined, options);
      }
    }

    return new OAuthError("invalid_request", "Invalid request");
  }
}

export class OAuthAuthorizationError extends OAuthError {
  public readonly redirectUri: URL;
  public readonly issuer: string;
  public readonly state: string | undefined;

  constructor(
    code: OAuthErrorCode,
    redirectUri: string | URL,
    issuer: string | URL,
    state?: string,
    description?: string,
    uri?: string | URL,
    options?: { cause: unknown },
  ) {
    super(code, description, uri, options);
    this.redirectUri = new URL(redirectUri);
    this.issuer = issuer.toString();
    this.state = state;

    Object.setPrototypeOf(this, OAuthAuthorizationError.prototype);
    this.name = "OAuthAuthorizationError";
  }

  get response() {
    return redirectResponse(this.redirectUri, {
      error: this.code,
      error_description: this.description,
      error_uri: this.uri?.toString(),
      iss: this.issuer,
      state: this.state,
    });
  }
}
