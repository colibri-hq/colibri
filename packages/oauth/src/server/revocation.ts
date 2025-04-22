import { parseRequestBody } from "../utilities";
import { z } from "zod";
import { OAuthError } from "../errors";
import { type AuthorizationServerOptions } from "../types";
import { assertAuthorization } from "./assert";

/**
 * Token Revocation Endpoint
 * =========================
 * Implementations **MUST** support the revocation of refresh tokens and **SHOULD** support the
 * revocation of access tokens (see
 * [Implementation Note](https://datatracker.ietf.org/doc/html/rfc7009#section-3)).
 *
 * The client requests the revocation of a particular token by making an HTTP `POST` request to
 * the token revocation endpoint URL. This URL **MUST** conform to the rules given in
 * [RFC 6749, Section 3.1](https://datatracker.ietf.org/doc/html/rfc6749#section-3.1). Clients
 * **MUST** verify that the URL is an HTTPS URL.
 *
 * The means to obtain the location of the revocation endpoint is out of the scope of this
 * specification. For example, the client developer may consult the server's documentation or
 * automatic discovery may be used. As this endpoint is handling security credentials, the
 * endpoint location needs to be obtained from a trustworthy source.
 *
 * Since requests to the token revocation endpoint result in the transmission of plaintext
 * credentials in the HTTP request, URLs for token revocation endpoints **MUST** be HTTPS URLs.
 * The authorization server **MUST** use Transport Layer Security (TLS)
 * [RFC 5246](https://datatracker.ietf.org/doc/html/rfc5246) in a version compliant with
 * [RFC 6749, Section 1.6](https://datatracker.ietf.org/doc/html/rfc6749#section-1.6).
 * Implementations **MAY** also support additional transport-layer security mechanisms that meet
 * their security requirements.
 *
 * If the host of the token revocation endpoint can also be reached over HTTP, then the server
 * **SHOULD** also offer a revocation service at the corresponding HTTP URI, but it **MUST NOT**
 * publish this URI as a token revocation endpoint. This ensures that tokens accidentally sent
 * over HTTP will be revoked.
 *
 * Revocation Request
 * ------------------
 *
 * The client constructs the request by including the following parameters using the
 * `application/x-www-form-urlencoded` format in the HTTP request entity-body:
 *
 *  - `token`
 *    **REQUIRED.**  The token that the client wants to get revoked.
 *
 *  - `token_type_hint`
 *    **OPTIONAL.**  A hint about the type of the token submitted for revocation. Clients **MAY**
 *    pass this parameter in order to help the authorization server to optimize the token lookup.
 *    If the server is unable to locate the token using the given hint, it **MUST** extend its
 *    search across all of its supported token types. An authorization server **MAY** ignore this
 *    parameter, particularly if it is able to detect the token type automatically.
 *    This specification defines two such values:
 *
 *    - **`access_token`:** An access token as defined in
 *      [RFC 6749, Section 1.4](https://datatracker.ietf.org/doc/html/rfc6749#section-1.4)
 *
 *    - **`refresh_token`:** A refresh token as defined in
 *      [RFC 6749, Section 1.5](https://datatracker.ietf.org/doc/html/rfc6749#section-1.5)
 *
 *    Specific implementations, profiles, and extensions of this specification **MAY** define
 *    other values for this parameter using the registry defined in
 *    [Section 4.1.2](https://datatracker.ietf.org/doc/html/rfc7009#section-4.1.2).
 *
 * The client also includes its authentication credentials as described
 * in [Section 2.3 of RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3).
 *
 * For example, a client may request the revocation of a refresh token with the following request:
 *
 * ```http
 * POST /revoke HTTP/1.1
 * Host: server.example.com
 * Content-Type: application/x-www-form-urlencoded
 * Authorization: Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW
 *
 * token=45ghiukldjahdnhzdauz&token_type_hint=refresh_token
 * ```
 *
 * The authorization server first validates the client credentials (in case of a confidential
 * client) and then verifies whether the token was issued to the client making the revocation
 * request. If this validation fails, the request is refused and the client is informed of the
 * error by the authorization server as described below.
 *
 * In the next step, the authorization server invalidates the token. The invalidation takes place
 * immediately, and the token cannot be used again after the revocation. In practice, there could
 * be a propagation delay, for example, in which some servers know about the invalidation while
 * others do not. Implementations should minimize that window, and clients must not try to use the
 * token after receipt of an HTTP `200` response from the server.
 *
 * Depending on the authorization server's revocation policy, the revocation of a particular token
 * may cause the revocation of related tokens and the underlying authorization grant. If the
 * particular token is a refresh token and the authorization server supports the revocation of
 * access tokens, then the authorization server **SHOULD** also invalidate all access tokens based
 * on the same authorization grant (see Implementation Note). If the token passed to the request
 * is an access token, the server **MAY** revoke the respective refresh token as well.
 *
 * > **Note:** A client compliant with [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
 *   must be prepared to handle unexpected token invalidation at any time. Independent of the
 *   revocation mechanism specified in this document, resource owners may revoke authorization
 *   grants, or the authorization server may invalidate tokens in order to mitigate security
 *   threats. Thus, having different server policies with respect to cascading the revocation of
 *   tokens should not pose interoperability problems.
 *
 * Revocation Response
 * -------------------
 * The authorization server responds with HTTP status code `200` if the token has been revoked
 * successfully or if the client submitted an invalid token.
 *
 * > **Note:** Invalid tokens do not cause an error response since the client cannot handle such
 *   an error in a reasonable way. Moreover, the purpose of the revocation request, invalidating
 *   the particular token, is already achieved.
 *
 * The content of the response body is ignored by the client as all necessary information is
 * conveyed in the response code.
 *
 * An invalid token type hint value is ignored by the authorization server and does not influence
 * the revocation response.
 *
 * Error Response
 * --------------
 * The error presentation conforms to the definition in
 * [Section 5.2 of RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2).
 * The following additional error code is defined for the token revocation endpoint:
 *
 *  - `unsupported_token_type`: The authorization server does not support the revocation of the
 *    presented token type. That is, the client tried to revoke an access token on a server not
 *    supporting this feature.
 *
 * If the server responds with HTTP status code `503`, the client must assume the token still
 * exists and may retry after a reasonable delay. The server may include a `Retry-After` header in
 * the response to indicate how long the service is expected to be unavailable to the
 * requesting client.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7009#section-2 RFC 7009, Section 2
 */
export async function handleTokenRevocation<
  T extends AuthorizationServerOptions,
>(request: Request, { tokenRevocation, loadAccessToken }: T) {
  if (!tokenRevocation) {
    throw new OAuthError(
      "invalid_request",
      "The token revocation endpoint is not supported on this server",
    );
  }

  const { revokeAccessToken, revokeRefreshToken } = tokenRevocation;
  const body = await parseRequestBody(request);
  const token = z
    .string({ message: "The Access Token is missing or invalid" })
    .safeParse(body.token);

  if (!token.success) {
    throw new OAuthError("invalid_client", token.error);
  }

  const tokenTypeHint = z
    .enum(["access_token", "refresh_token"], {
      message: `The token type hint must be one of 'access_token' or 'refresh_token'`,
    })
    .optional()
    .safeParse(body.token_type_hint);

  if (!tokenTypeHint.success) {
    throw new OAuthError("invalid_request", tokenTypeHint.error);
  }

  try {
    const { client_id } = await assertAuthorization(request, {
      loadAccessToken,
    });

    switch (tokenTypeHint.data) {
      case "access_token":
        await revokeAccessToken(token.data, client_id);
        break;
      case "refresh_token":
      default:
        await revokeRefreshToken(token.data, client_id);
        break;
    }
  } finally {
    // Failures during token revokation are supposed to return a 200 OK regardless:
    // https://datatracker.ietf.org/doc/html/rfc7009#section-2.2
  }

  return new Response(undefined, { status: 200 });
}
