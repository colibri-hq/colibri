import { z } from "zod";
import type { AuthorizationServerOptions } from "../types.js";
import { OAuthError } from "../errors.js";
import { jsonResponse, parseRequestBody } from "../utilities.js";
import { assertAuthorization } from "./assert.js";

/**
 * Token Introspection Endpoint
 * ============================
 * The introspection endpoint is an OAuth 2.0 endpoint that takes a parameter representing an
 * OAuth 2.0 token and returns a JSON [RFC 7159](https://datatracker.ietf.org/doc/html/rfc7159)
 * document representing the meta information surrounding the token, including whether this token
 * is currently active. The definition of an active token is dependent upon the authorization
 * server, but this is commonly a token that has been issued by this authorization server, is not
 * expired, has not been revoked, and is valid for use at the protected resource making the
 * introspection call.
 *
 * The introspection endpoint **MUST** be protected by a transport-layer security mechanism as
 * described in [Section 4](https://datatracker.ietf.org/doc/html/rfc7662#section-4). The means by
 * which the protected resource discovers the location of the introspection endpoint are outside
 * the scope of this specification.
 *
 * Introspection Request
 * ---------------------
 * The protected resource calls the introspection endpoint using an HTTP `POST`
 * ([RFC 7231](https://datatracker.ietf.org/doc/html/rfc7231)) request with parameters sent as
 * `application/x-www-form-urlencoded` data as defined in [W3C.REC-html5-20141028]. The protected
 * resource sends a parameter representing the token along with optional parameters representing
 * additional context that is known by the protected resource to aid the authorization server in
 * its response.
 *
 *  - **`token`**
 *    **REQUIRED.** The string value of the token. For access tokens, this is the `access_token`
 *    value returned from the token endpoint defined in
 *    [OAuth 2.0, RFC 6749, Section 5.1](https://datatracker.ietf.org/doc/html/rfc6749).
 *    For refresh tokens, this is the `refresh_token` value returned from the token endpoint as
 *    defined in
 *    [OAuth 2.0, RFC 6749, Section 5.1](https://datatracker.ietf.org/doc/html/rfc6749).
 *    Other token types are outside the scope of this specification.
 *
 *  - **`token_type_hint`**
 *    **OPTIONAL.** A hint about the type of the token submitted for introspection. The protected
 *    resource **MAY** pass this parameter to help the authorization server optimize the token
 *    lookup. If the server is unable to locate the token using the given hint, it **MUST** extend
 *    its search across all of its supported token types. An authorization server **MAY** ignore
 *    this parameter, particularly if it is able to detect the token type automatically. Values
 *    for this field are defined in the *OAuth Token Type Hints* registry defined in
 *    [OAuth Token Revocation, RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009).
 *
 * The introspection endpoint **MAY** accept other *OPTIONAL* parameters to provide further
 * context to the query. For instance, an authorization server may desire to know the IP address
 * of the client accessing the protected resource to determine if the correct client is likely to
 * be presenting the token. The definition of this or any other parameters are outside the scope
 * of this specification, to be defined by service documentation or extensions to this
 * specification. If the authorization server is unable to determine the state of the token
 * without additional information, it **SHOULD** return an introspection response indicating the
 * token is not active as described in
 * [Section 2.2](https://datatracker.ietf.org/doc/html/rfc7662#section-2.2).
 *
 * To prevent token scanning attacks, the endpoint **MUST** also require some form of
 * authorization to access this endpoint, such as client authentication as described in
 * [OAuth 2.0, RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) or a separate OAuth 2.0
 * access token such as the bearer token described in
 * [OAuth 2.0 Bearer Token Usage, RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750).
 * The methods of managing and validating these authentication credentials are out of scope of
 * this specification.
 *
 * For example, the following shows a protected resource calling the token introspection endpoint
 * to query about an OAuth 2.0 bearer token. The protected resource is using a separate OAuth 2.0
 * bearer token to authorize this call.
 *
 * The following is a non-normative example request:
 *
 * ```http
 * POST /introspect HTTP/1.1
 * Host: server.example.com
 * Accept: application/json
 * Content-Type: application/x-www-form-urlencoded
 * Authorization: Bearer 23410913-abewfq.123483
 *
 * token=2YotnFZFEjr1zCsicMWpAA
 * ```
 *
 * In this example, the protected resource uses a client identifier and client secret to
 * authenticate itself to the introspection endpoint. The protected resource also sends a token
 * type hint indicating that it is inquiring about an access token.
 *
 * The following is a non-normative example request:
 *
 * ```http
 * POST /introspect HTTP/1.1
 * Host: server.example.com
 * Accept: application/json
 * Content-Type: application/x-www-form-urlencoded
 * Authorization: Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW
 *
 * token=mF_9.B5f-4.1JqM&token_type_hint=access_token
 * ```
 *
 * Introspection Response
 * ----------------------
 * The server responds with a JSON object
 * ([RFC 7159](https://datatracker.ietf.org/doc/html/rfc7159)) in `application/json` format with
 * the following top-level members:
 *
 *  - **`active`**
 *    **REQUIRED.** Boolean indicator of whether or not the presented token is currently active.
 *    The specifics of a token's `active` state will vary depending on the implementation of the
 *    authorization server and the information it keeps about its tokens, but a `true` value
 *    return for the `active` property will generally indicate that a given token has been issued
 *    by this authorization server, has not been revoked by the resource owner, and is within its
 *    given time window of validity (e.g., after its issuance time and before its expiration
 *    time). See [Section 4](https://datatracker.ietf.org/doc/html/rfc7662#section-4) for
 *    information on implementation of such checks.
 *
 *  - **`scope`**
 *    **OPTIONAL.** A JSON string containing a space-separated list of scopes associated with
 *    this token, in the format described in
 *    [Section 3.3 of OAuth 2.0, RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749).
 *
 *  - **`client_id`**
 *    **OPTIONAL.** Client identifier for the OAuth 2.0 client that requested this token.
 *
 *  - **`username`**
 *    **OPTIONAL.** Human-readable identifier for the resource owner who authorized this token.
 *
 *  - **`token_type`**
 *    **OPTIONAL.** Type of the token as defined in
 *    [Section 5.1 of OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749).
 *
 *  - **`exp`**
 *    **OPTIONAL.** Integer timestamp, measured in the number of seconds since January 1 1970 UTC,
 *    indicating when this token will expire, as defined in
 *    [JWT, RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519).
 *
 *  - **`iat`**
 *    **OPTIONAL.** Integer timestamp, measured in the number of seconds
 *    since January 1 1970 UTC, indicating when this token was
 *    originally issued, as defined in JWT [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519).
 *
 *  - **`nbf`**
 *    **OPTIONAL.** Integer timestamp, measured in the number of seconds since January 1 1970 UTC,
 *    indicating when this token is not to be used before, as defined in
 *    [JWT, RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519).
 *
 *  - **`sub`**
 *    **OPTIONAL.** Subject of the token, as defined in
 *    [JWT, RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519). Usually a machine-readable
 *    identifier of the resource owner who authorized this token.
 *
 *  - **`aud`**
 *    **OPTIONAL.** Service-specific string identifier or list of string identifiers representing
 *    the intended audience for this token, as defined in
 *    [JWT, RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519).
 *
 *  - **`iss`**
 *    **OPTIONAL.** String representing the issuer of this token, as defined in
 *    [JWT, RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519).
 *
 *  - **`jti`**
 *    **OPTIONAL.** String identifier for the token, as defined in
 *    [JWT, RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519).
 *
 * Specific implementations **MAY** extend this structure with their own service-specific response
 * names as top-level members of this JSON object. Response names intended to be used across
 * domains **MUST** be registered in the *OAuth Token Introspection Response* registry
 * defined in [Section 3.1](https://datatracker.ietf.org/doc/html/rfc7662#section-3.1).
 *
 * The authorization server **MAY** respond differently to different protected resources making
 * the same request. For instance, an authorization server **MAY** limit which scopes from a given
 * token are returned for each protected resource to prevent a protected resource from learning
 * more about the larger network than is necessary for its operation.
 *
 * The response **MAY** be cached by the protected resource to improve performance and reduce load
 * on the introspection endpoint, but at the cost of liveness of the information used by the
 * protected resource to make authorization decisions. See
 * [Section 4](https://datatracker.ietf.org/doc/html/rfc7662#section-4) for more information
 * regarding the trade-off when the response is cached.
 *
 * For example, the following response contains a set of information about an active token:
 *
 * The following is a non-normative example response:
 *
 * ```http
 * HTTP/1.1 200 OK
 * Content-Type: application/json
 *
 * {
 *   "active": true,
 *   "client_id": "l238j323ds-23ij4",
 *   "username": "jdoe",
 *   "scope": "read write dolphin",
 *   "sub": "Z5O3upPC88QrAjx00dis",
 *   "aud": "https://protected.example.net/resource",
 *   "iss": "https://server.example.com/",
 *   "exp": 1419356238,
 *   "iat": 1419350238,
 *   "extension_field": "twenty-seven"
 * }
 *```
 *
 * If the introspection call is properly authorized but the token is not active, does not exist on
 * this server, or the protected resource is not allowed to introspect this particular token, then
 * the authorization server **MUST** return an introspection response with the `active` field set
 * to `false`. Note that to avoid disclosing too much of the authorization server's state to a
 * third party, the authorization server **SHOULD NOT** include any additional information about
 * an inactive token, including why the token is inactive.
 *
 * The following is a non-normative example response for a token that has been revoked or is
 * otherwise invalid:
 *
 * ```http
 * HTTP/1.1 200 OK
 * Content-Type: application/json
 *
 * {
 *   "active": false
 * }
 *```
 *
 * Error Response
 * --------------
 * If the protected resource uses OAuth 2.0 client credentials to authenticate to the
 * introspection endpoint and its credentials are invalid, the authorization server responds with
 * an HTTP `401` (Unauthorized) as described in
 * [Section 5.2 of OAuth 2.0, RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749).
 *
 * If the protected resource uses an OAuth 2.0 bearer token to authorize its call to the
 * introspection endpoint and the token used for authorization does not contain sufficient
 * privileges or is otherwise invalid for this request, the authorization server responds with an
 * HTTP `401` code as described in
 * [Section 3 of OAuth 2.0 Bearer Token Usage, RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750).
 *
 * Note that a properly formed and authorized query for an inactive or otherwise invalid token (or
 * a token the protected resource is not allowed to know about) is not considered an error
 * response by this specification. In these cases, the authorization server **MUST** instead
 * respond with an introspection response with the `active` field set to `false` as described in
 * [Section 2.2](https://datatracker.ietf.org/doc/html/rfc7662#section-2.2).
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7662#section-2 RFC 7662, Section 2
 */
export async function handleTokenIntrospection<T extends AuthorizationServerOptions>(
  request: Request,
  { loadAccessToken, tokenIntrospection }: Pick<T, "loadAccessToken" | "tokenIntrospection">,
) {
  if (!tokenIntrospection) {
    throw new OAuthError("invalid_request", "The introspection endpoint is not enabled");
  }

  const body = await parseRequestBody(request);
  const token = z
    .string({ message: "The Access Token is missing or invalid" })
    .safeParse(body.token);

  if (!token.success) {
    throw new OAuthError("invalid_client", token.error);
  }

  let authorizedClientId: string;

  try {
    ({ client_id: authorizedClientId } = await assertAuthorization(request, { loadAccessToken }));
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    const { message, cause } = error;

    throw new OAuthError("invalid_client", message + (cause ? `: ${cause}` : ""));
  }

  const accessToken = await loadAccessToken(token.data);

  if (
    !accessToken ||
    accessToken.revoked_at !== null ||
    accessToken.expires_at <= new Date() ||
    authorizedClientId !== accessToken.client_id
  ) {
    return jsonResponse({ active: false });
  }

  return jsonResponse({
    active: true,
    scope: accessToken.scopes.join(" "),
    client_id: accessToken.client_id,
    username: accessToken.user_id,
    exp: Math.floor(accessToken.expires_at.getTime() / 1_000),
  });
}
