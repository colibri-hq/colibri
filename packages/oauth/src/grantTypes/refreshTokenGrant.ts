import { OAuthError } from "../errors.js";
import type { Entities } from "../types.js";
import { z } from "zod";
import { defineGrantType, type GrantTypeOptions } from "./grantType.js";

export interface RefreshTokenGrantOptions<
  T extends Entities.RefreshToken = Entities.RefreshToken,
> extends GrantTypeOptions {
  loadRefreshToken(token: string): Promise<T | undefined>;
}

/**
 * Refreshing an Access Token
 * ==========================
 * If the authorization server issued a refresh token to the client, the client makes a refresh
 * request to the token endpoint by adding the following parameters using the
 * `application/x-www-form-urlencoded` format per
 * [Appendix B](https://www.rfc-editor.org/rfc/rfc6749#appendix-B) with a character encoding of
 * UTF-8 in the HTTP request entity-body:
 *
 *  - **`grant_type`:**
 *       **REQUIRED.** Value **MUST** be set to `refresh_token`.
 *
 *  - **`refresh_token`:**
 *       **REQUIRED.** The refresh token issued to the client.
 *
 *  - **`scope`:**
 *       **OPTIONAL.** The scope of the access request as described by
 *       [Section 3.3](https://www.rfc-editor.org/rfc/rfc6749#section-3.3). The requested scope
 *       **MUST NOT** include any scope not originally granted by the resource owner, and if omitted
 *       is treated as equal to the scope originally granted by the resource owner.
 *
 * Because refresh tokens are typically long-lasting credentials used to request additional access
 * tokens, the refresh token is bound to the client to which it was issued. If the client type is
 * confidential or the client was issued client credentials (or assigned other authentication
 * requirements), the client **MUST** authenticate with the authorization server as described in
 * [Section 3.2.1](https://www.rfc-editor.org/rfc/rfc6749#section-3.2.1).
 *
 * For example, the client makes the following HTTP request using transport-layer security (with
 * extra line breaks for display purposes only):
 *
 * ```http
 * POST /token HTTP/1.1
 * Host: server.example.com
 * Authorization: Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW
 * Content-Type: application/x-www-form-urlencoded
 *
 * grant_type=refresh_token&refresh_token=tGzv3JOkF0XG5Qx2TlKWIA
 * ```
 *
 * The authorization server **MUST**:
 *
 *  - require client authentication for confidential clients or for any client that was issued client
 *    credentials (or with other authentication requirements),
 *
 *  - authenticate the client if client authentication is included and ensure that the refresh token
 *    was issued to the authenticated client, and
 *
 *  - validate the refresh token.
 *
 * If valid and authorized, the authorization server issues an access token as described in
 * [Section 5.1](https://www.rfc-editor.org/rfc/rfc6749#section-5.1). If the request failed
 * verification or is invalid, the authorization server returns an error response as described in
 * [Section 5.2](https://www.rfc-editor.org/rfc/rfc6749#section-5.2).
 *
 * The authorization server **MAY** issue a new refresh token, in which case the client **MUST**
 * discard the old refresh token and replace it with the new refresh token. The authorization server
 * **MAY** revoke the old refresh token after issuing a new refresh token to the client. If a new
 * refresh token is issued, the refresh token scope **MUST** be identical to that of the refresh
 * token included by the client in the request.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-6 RFC 6749, Section 6
 */
export const RefreshTokenGrant = defineGrantType({
  type: "refresh_token",

  get schema() {
    return z.object({
      grant_type: z.literal("refresh_token", {
        message: "The grant type is missing or invalid",
      }),
      client_id: z.string({
        required_error: "The client ID is missing",
        invalid_type_error: "The client ID is invalid",
      }),
      refresh_token: z.string({
        required_error: "The refresh token is missing",
        invalid_type_error: "The refresh token is invalid",
      }),
      scope: z
        .string()
        .optional()
        .transform((scopes) => scopes?.split(" ") ?? []),
    });
  },

  configure(options: RefreshTokenGrantOptions) {
    return options;
  },

  async validate({ refresh_token, scope }, client) {
    if (!scope.every((item) => client.scopes?.includes(item))) {
      throw new OAuthError("invalid_scope", "One or more scopes are invalid");
    }

    return { token: refresh_token, scope };
  },

  async handle({ token, scope }, client) {
    // region Verify persisted refresh token instance
    let refreshToken: Entities.RefreshToken | undefined;

    try {
      refreshToken = await this.options.loadRefreshToken(token);
    } catch {
      throw new OAuthError(
        "invalid_grant",
        "The refresh token is invalid or expired",
      );
    }

    if (
      !refreshToken ||
      refreshToken.revoked_at !== null ||
      refreshToken.expires_at <= new Date()
    ) {
      throw new OAuthError(
        "invalid_grant",
        "The refresh token is invalid or expired",
      );
    }

    if (refreshToken.client_id !== client.id) {
      throw new OAuthError("invalid_client", "The client ID is invalid");
    }
    // endregion

    // region Verify scopes
    if (
      scope &&
      !scope.every((scope: string) => refreshToken.scopes.includes(scope))
    ) {
      throw new OAuthError("invalid_scope", "One or more scopes are invalid");
    }

    const effectiveScopes =
      scope && scope.length > 0 ? scope : refreshToken.scopes;
    // endregion

    return {
      accessToken: {
        ttl: this.options.accessTokenTtl,
      },
      refreshToken: {
        ttl: this.options.refreshTokenTtl,
        exchange: refreshToken.token,
      },
      userIdentifier: refreshToken.user_id ?? undefined,
      scopes: effectiveScopes,
    };
  },
});
