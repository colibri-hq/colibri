import { OAuthError } from "../errors.js";
import { encodeToBase64, hash, timingSafeEqual } from "@colibri-hq/shared";
import { z } from "zod";
import { defineGrantType, type GrantTypeOptions } from "./grantType.js";

export interface ClientCredentialsGrantOptions extends GrantTypeOptions {
  /**
   * Whether to include a refresh token in the response. As per
   * [the specification](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4.3), a refresh
   * token **SHOULD NOT** be included in the response for the client credentials grant type, which
   * is the default behavior. However, if you want to include a refresh token nevertheless, set this
   * option to `true`.
   */
  includeRefreshToken?: boolean;
}

/**
 * Client Credentials Grant
 * ========================
 * The client can request an access token using only its client credentials (or other supported
 * means of authentication) when the client is requesting access to the protected resources under
 * its control, or those of another resource owner that have been previously arranged with the
 * authorization server (the method of which is beyond the scope of this specification).
 *
 * The client credentials grant type **MUST** only be used by confidential clients.
 *
 * ```
 *   +---------+                                  +---------------+
 *   |         |                                  |               |
 *   |         |>--(A)- Client Authentication --->| Authorization |
 *   | Client  |                                  |     Server    |
 *   |         |<--(B)---- Access Token ---------<|               |
 *   |         |                                  |               |
 *   +---------+                                  +---------------+
 * ```
 * _Figure 6: Client Credentials Flow_
 *
 * The flow illustrated in Figure 6 includes the following steps:
 *
 *  (A) The client authenticates with the authorization server and requests an access token from the
 *      token endpoint.
 *
 *  (B) The authorization server authenticates the client, and if valid, issues an access token.
 *
 * Authorization Request and Response
 * ----------------------------------
 * Since the client authentication is used as the authorization grant, no additional authorization
 * request is needed.
 *
 * Access Token Request
 * --------------------
 * The client makes a request to the token endpoint by adding the following parameters using the
 * `application/x-www-form-urlencoded` format per
 * [Appendix B](https://www.rfc-editor.org/rfc/rfc6749#appendix-B) with a character encoding of
 * UTF-8 in the HTTP request entity-body:
 *
 *  - **`grant_type`:**
 *    **REQUIRED.** Value **MUST** be set to `client_credentials`.
 *
 *  - **`scope`:**
 *    **OPTIONAL.** The scope of the access request as described by
 *    [Section 3.3](https://www.rfc-editor.org/rfc/rfc6749#section-3.3).
 *
 * The client **MUST** authenticate with the authorization server as described in
 * [Section 3.2.1](https://www.rfc-editor.org/rfc/rfc6749#section-3.2.1). For example, the client
 * makes the following HTTP request using transport-layer security (with extra line breaks for
 * display purposes only):
 *
 * ```http
 * POST /token HTTP/1.1
 * Host: server.example.com
 * Authorization: Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW
 * Content-Type: application/x-www-form-urlencoded
 *
 * grant_type=client_credentials
 * ```
 *
 * The authorization server **MUST** authenticate the client.
 *
 * Access Token Response
 * ---------------------
 * If the access token request is valid and authorized, the authorization server issues an access
 * token as described in [Section 5.1](https://www.rfc-editor.org/rfc/rfc6749#section-5.1).
 * A refresh token **SHOULD NOT** be included. If the request failed client authentication or is
 * invalid, the authorization server returns an error response as described in
 * [Section 5.2](https://www.rfc-editor.org/rfc/rfc6749#section-5.2).
 *
 * An example successful response:
 *
 * ```http
 * HTTP/1.1 200 OK
 * Content-Type: application/json;charset=UTF-8
 * Cache-Control: no-store
 * Pragma: no-cache
 *
 * {
 *   "access_token":"2YotnFZFEjr1zCsicMWpAA",
 *   "token_type":"example",
 *   "expires_in":3600,
 *   "example_parameter":"example_value"
 * }
 * ```
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.4 RFC 6749, Section 4.4
 */
export const ClientCredentialsGrant = defineGrantType({
  type: "client_credentials",

  get schema() {
    return z
      .object({
        grant_type: z.literal("client_credentials", {
          message: "The grant type is missing or invalid",
        }),
        client_id: z.string({
          required_error: "The client ID is missing",
          invalid_type_error: "The client ID is invalid",
        }),
        client_secret: z.string({
          required_error: "The client secret is missing",
          invalid_type_error: "The client secret is invalid",
        }),
        scope: z
          .string()
          .optional()
          .transform((scope) => scope?.split(" ") ?? []),
      })
      .superRefine(({ client_id, client_secret }, context) => {
        if (!client_id) {
          context.addIssue({
            code: "custom",
            path: ["client_id"],
            message: "The client ID is missing",
            params: { oauth_error: "invalid_request" },
          });
        }

        if (!client_secret) {
          context.addIssue({
            code: "custom",
            path: ["client_secret"],
            message: "The client secret is missing",
            params: { oauth_error: "invalid_request" },
          });
        }
      });
  },

  configure(options: ClientCredentialsGrantOptions) {
    return options;
  },

  async validate({ grant_type, client_id, client_secret, scope }, client) {
    if (client.redirect_uris !== null || client.secret === null) {
      throw new OAuthError("invalid_client", "The client ID is invalid");
    }

    const secretHash = encodeToBase64(await hash(client_secret), true, false);

    if (!(await timingSafeEqual(secretHash, client.secret))) {
      throw new OAuthError(
        "invalid_request",
        "The client secret is missing or invalid",
      );
    }

    if (!scope.every((item) => client.scopes?.includes(item))) {
      throw new OAuthError("invalid_scope", "One or more scopes are invalid");
    }

    return {
      grant_type,
      client_id,
      client_secret,
      scope,
    };
  },

  async handle({ scope: scopes = [] }) {
    const { accessTokenTtl, includeRefreshToken, refreshTokenTtl } =
      this.options;

    return {
      accessToken: {
        ttl: accessTokenTtl,
      },
      refreshToken: includeRefreshToken ? { ttl: refreshTokenTtl } : undefined,
      scopes,
    };
  },
});
