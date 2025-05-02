import { z } from "zod";
import {
  defineGrantType,
  type GrantTypeOptions,
} from "./grantType.js";
import { OAuthAuthorizationError, OAuthError } from "../errors.js";
import {
  type AuthorizationServerOptions,
  type Entities,
  type PkceCodeChallengeMethod,
  type ResponseMode,
  type ResponseType,
} from "../types.js";
import {
  jsonResponse,
  parseRequestBody,
  redirectResponse,
  resolveClient,
  resolveScopes,
  timeOffset,
} from "../utilities.js";
import type { MaybePromise } from "@colibri-hq/shared";

export interface AuthorizationCodeGrantOptions<
  T extends Entities.AuthorizationCode = Entities.AuthorizationCode,
> extends GrantTypeOptions {
  loadAuthorizationCode: (code: string) => MaybePromise<T | undefined>;
  storeAuthorizationCode: (authorizationCode: {
    clientId: string;
    challenge: string;
    challengeMethod?: PkceCodeChallengeMethod;
    redirectUri: string;
    scopes: string[];
    ttl: number;
    userIdentifier: string;
    usedAt?: Date;
  }) => MaybePromise<T>;

  /**
   * The time-to-live (TTL) for authorization codes in seconds
   */
  ttl?: number;
  endpoint?: string | URL;
  codeChallengeMethodsSupported?: PkceCodeChallengeMethod[];
  responseModesSupported?: ResponseMode[];
  responseTypesSupported?: ResponseType[];
}

/**
 * Authorization Code Grant
 * ========================
 * The authorization code grant type is used to obtain both access tokens and refresh tokens and is
 * optimized for confidential clients. Since this is a redirection-based flow, the client must be
 * capable of interacting with the resource owner's user-agent (typically a web browser) and capable
 * of receiving incoming requests (via redirection) from the authorization server.
 *
 * ```
 *   +----------+
 *   | Resource |
 *   |   Owner  |
 *   |          |
 *   +----------+
 *        ^
 *        |
 *       (B)
 *   +----|-----+          Client Identifier      +---------------+
 *   |         -+----(A)-- & Redirection URI ---->|               |
 *   |  User-   |                                 | Authorization |
 *   |  Agent  -+----(B)-- User authenticates --->|     Server    |
 *   |          |                                 |               |
 *   |         -+----(C)-- Authorization Code ---<|               |
 *   +-|----|---+                                 +---------------+
 *     |    |                                         ^      v
 *    (A)  (C)                                        |      |
 *     |    |                                         |      |
 *     ^    v                                         |      |
 *   +---------+                                      |      |
 *   |         |>---(D)-- Authorization Code ---------'      |
 *   |  Client |          & Redirection URI                  |
 *   |         |                                             |
 *   |         |<---(E)----- Access Token -------------------'
 *   +---------+       (w/ Optional Refresh Token)
 * ```
 * *Figure 3: Authorization Code Flow*
 *
 * > **Note:** The lines illustrating steps (A), (B), and (C) are broken into two parts as they pass
 *   through the user-agent.
 *
 *
 * The flow illustrated in Figure 3 includes the following steps:
 *
 *  A) The client initiates the flow by directing the resource owner's user-agent to the
 *  authorization endpoint. The client includes its client identifier, requested scope, local state,
 *  and a redirection URI to which the authorization server will send the user-agent back once
 *  access is granted (or denied).
 *
 *  B) The authorization server authenticates the resource owner (via the user-agent) and
 *     establishes whether the resource owner grants or denies the client's access request.
 *
 *  C) Assuming the resource owner grants access, the authorization server redirects the user-agent
 *     back to the client using the redirection URI provided earlier (in the request or during
 *     client registration). The redirection URI includes an authorization code and any local state
 *     provided by the client earlier.
 *
 *  D) The client requests an access token from the authorization server's token endpoint by
 *     including the authorization code received in the previous step. When making the request, the
 *     client authenticates with the authorization server. The client includes the redirection URI
 *     used to obtain the authorization code for verification.
 *
 *  E) The authorization server authenticates the client, validates the authorization code, and
 *     ensures that the redirection URI received matches the URI used to redirect the client in
 *     step (C). If valid, the authorization server responds back with an access token and,
 *     optionally, a refresh token.
 *
 * Access Token Request
 * --------------------
 * The client makes a request to the token endpoint by sending the following parameters using the
 * `application/x-www-form-urlencoded` format per
 * [Appendix B](https://datatracker.ietf.org/doc/html/rfc6749#appendix-B) with a character encoding
 * of UTF-8 in the HTTP request entity-body:
 *
 *  - **`grant_type`:**
 *    **REQUIRED.** Value **MUST** be set to `authorization_code`.
 *
 *  - **`code`:**
 *    **REQUIRED.** The authorization code received from the authorization server.
 *
 *  - **`redirect_uri`:**
 *    **REQUIRED,** if the `redirect_uri` parameter was included in the authorization request as
 *    described in [Section 4.1.1](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.1),
 *    and their values **MUST** be identical.
 *
 *  - **`client_id`:**
 *    **REQUIRED,** if the client is not authenticating with the authorization server as described
 *    in [Section 3.2.1](https://datatracker.ietf.org/doc/html/rfc6749#section-3.2.1).
 *
 * If the client type is confidential or the client was issued client credentials (or assigned other
 * authentication requirements), the client **MUST** authenticate with the authorization server as
 * described in [Section 3.2.1](https://datatracker.ietf.org/doc/html/rfc6749#section-3.2.1).
 *
 * For example, the client makes the following HTTP request using TLS (with extra line breaks for
 * display purposes only):
 *
 * ```http
 * POST /token HTTP/1.1
 * Host: server.example.com
 * Authorization: Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW
 * Content-Type: application/x-www-form-urlencoded
 *
 *  grant_type=authorization_code
 * &code=SplxlOBeZQQYbYS6WxSbIA
 * &redirect_uri=https%3A%2F%2Fclient%2Eexample%2Ecom%2Fcb
 * ```
 *
 * The authorization server **MUST**:
 *
 *  - require client authentication for confidential clients or for any client that was issued client
 *  credentials (or with other authentication requirements),
 *
 *  - authenticate the client if client authentication is included,
 *
 *  - ensure that the authorization code was issued to the authenticated confidential client, or if
 *    the client is public, ensure that the code was issued to `client_id` in the request,
 *
 *  - verify that the authorization code is valid, and
 *
 *  - ensure that the `redirect_uri` parameter is present if the `redirect_uri` parameter was
 *    included in the initial authorization request as described in
 *    [Section 4.1.1](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.1), and if included
 *    ensure that their values are identical.
 *
 * Access Token Response
 * ---------------------
 * If the access token request is valid and authorized, the authorization server issues an access
 * token and optional refresh token as described in
 * [Section 5.1](https://datatracker.ietf.org/doc/html/rfc6749#section-5.1). If the request client
 * authentication failed or is invalid, the authorization server returns
 * an error response as described in
 * [Section 5.2](https://datatracker.ietf.org/doc/html/rfc6749#section-5.2).
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
 *   "refresh_token":"tGzv3JOkF0XG5Qx2TlKWIA",
 *   "example_parameter":"example_value"
 * }
 * ```
 */
export const AuthorizationCodeGrant = defineGrantType({
  type: "authorization_code",

  schema: z.object({
    grant_type: z.literal("authorization_code"),
    code: z.string(),
    redirect_uri: z.string().url(),
    client_id: z.string(),
    code_verifier: z.string().optional(),
  }),

  configure(options: AuthorizationCodeGrantOptions) {
    return options;
  },

  async validate(
    { code, code_verifier, redirect_uri },
    client,
  ): Promise<{ authorizationCode: Entities.AuthorizationCode }> {
    const authorizationCode = await this.options.loadAuthorizationCode(code);

    if (!authorizationCode) {
      throw new OAuthError(
        "invalid_grant",
        "The authorization code is invalid",
      );
    }

    // Check if the code has expired
    if (authorizationCode.expires_at <= new Date()) {
      throw new OAuthError(
        "invalid_grant",
        "The authorization code has expired",
      );
    }

    // Check if the code has been used
    if (authorizationCode.used_at) {
      throw new OAuthError(
        "invalid_grant",
        "The authorization code has already been used",
      );
    }

    // Check if the code was issued to the same client
    if (authorizationCode.client_id !== client.id) {
      throw new OAuthError(
        "invalid_grant",
        "The authorization code was issued to a different client",
      );
    }

    // Check if the redirect URI matches
    if (authorizationCode.redirect_uri !== redirect_uri) {
      throw new OAuthError("invalid_grant", "The redirect URI does not match");
    }

    // If PKCE is required, validate the code verifier
    if (authorizationCode.challenge) {
      if (!code_verifier) {
        throw new OAuthError(
          "invalid_request",
          "The code verifier is required",
        );
      }

      const isValid = await validateCodeVerifier(
        code_verifier,
        authorizationCode.challenge!,
        "S256",
      );

      if (!isValid) {
        throw new OAuthError("invalid_grant", "The code verifier is invalid");
      }
    }

    return { authorizationCode };
  },

  async handle({
    authorizationCode: {
      challenge,
      client_id: clientId,
      expires_at,
      redirect_uri: redirectUri,
      scopes,
      user_id: userIdentifier,
    },
  }) {
    // Mark the code as used
    await this.options.storeAuthorizationCode({
      challenge,
      clientId,
      redirectUri,
      scopes: scopes,
      ttl: timeOffset(expires_at),
      usedAt: new Date(),
      userIdentifier,
    });

    return {
      accessToken: {
        ttl: this.options.accessTokenTtl,
      },
      refreshToken: {
        ttl: this.options.refreshTokenTtl,
      },
      scopes: scopes,
      userIdentifier,
    };
  },
});

/**
 * Authorization Endpoint
 * ======================
 * The authorization endpoint is used to interact with the resource owner and obtain an
 * authorization grant. The authorization server **MUST** first verify the identity of the
 * resource owner. The way in which the authorization server authenticates the resource owner
 * (e.g., username and password login, session cookies) is beyond the scope of this specification.
 *
 * The means through which the client obtains the location of the authorization endpoint are
 * beyond the scope of this specification, but the location is typically provided in the service
 * documentation.
 *
 * The endpoint URI **MAY** include an `application/x-www-form-urlencoded` formatted (per
 * [Appendix B](https://datatracker.ietf.org/doc/html/rfc6749#appendix-B)) query component
 * ([RFC 3986, Section 3.4](https://datatracker.ietf.org/doc/html/rfc3986#section-3.4)), which
 * **MUST** be retained when adding additional query parameters. The endpoint URI **MUST NOT**
 * include a fragment component.
 *
 * Since requests to the authorization endpoint result in user authentication and the transmission
 * of clear-text credentials (in the HTTP response), the authorization server **MUST** require the
 * use of TLS as described in
 * [Section 1.6](https://datatracker.ietf.org/doc/html/rfc6749#section-1.6) when sending requests
 * to the authorization endpoint.
 *
 * The authorization server **MUST** support the use of the HTTP `GET` method
 * ([RFC 2616](https://datatracker.ietf.org/doc/html/rfc2616)) for the authorization endpoint and
 * **MAY** support the use of the `POST` method as well.
 *
 * Parameters sent without a value **MUST** be treated as if they were omitted from the request.
 * The authorization server **MUST** ignore unrecognized request parameters. Request and response
 * parameters **MUST NOT** be included more than once.
 *
 * Authorization Request
 * ---------------------
 * The client constructs the request URI by adding the following parameters to the query component
 * of the authorization endpoint URI using the `application/x-www-form-urlencoded` format, per
 * [Appendix B](https://datatracker.ietf.org/doc/html/rfc6749#appendix-B):
 *
 *  - **`response_type`:**
 *    **REQUIRED.** Value MUST be set to "code".
 *
 *  - **`client_id`:**
 *    **REQUIRED.** The client identifier as described in
 *    [Section 2.2](https://datatracker.ietf.org/doc/html/rfc6749#section-2.2).
 *
 *  - **`redirect_uri`:**
 *    **OPTIONAL.** As described in
 *    [Section 3.1.2](https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2).
 *
 *  - **`scope`:**
 *    **OPTIONAL.** The scope of the access request as described by
 *    [Section 3.3](https://datatracker.ietf.org/doc/html/rfc6749#section-3.3).
 *
 *  - **`state`:**
 *    **RECOMMENDED.** An opaque value used by the client to maintain state between the request and
 *    callback. The authorization server includes this value when redirecting the user-agent back to
 *    the client. The parameter **SHOULD** be used for preventing cross-site request forgery as
 *    described in [Section 10.12](https://datatracker.ietf.org/doc/html/rfc6749#section-10.12).
 *
 * The client directs the resource owner to the constructed URI using an HTTP redirection response,
 * or by other means available to it via the user-agent.
 *
 * For example, the client directs the user-agent to make the following HTTP request using TLS (with
 * extra line breaks for display purposes only):
 *
 * ```http
 * GET /authorize \
 *     ?response_type=code \
 *     &client_id=s6BhdRkqt3&state=xyz \
 *     &redirect_uri=https%3A%2F%2Fclient%2Eexample%2Ecom%2Fcb \
 *   HTTP/1.1
 * Host: server.example.com
 * ```
 *
 * The authorization server validates the request to ensure that all required parameters are present
 * and valid. If the request is valid, the authorization server authenticates the resource owner and
 * obtains an authorization decision (by asking the resource owner or by establishing approval via
 * other means).
 *
 * When a decision is established, the authorization server directs the user-agent to the provided
 * client redirection URI using an HTTP redirection response, or by other means available to it via
 * the user-agent.
 *
 * Authorization Response
 * ----------------------
 * If the resource owner grants the access request, the authorization server issues an authorization
 * code and delivers it to the client by adding the following parameters to the query component of
 * the redirection URI using the `application/x-www-form-urlencoded` format, per
 * [Appendix B](https://datatracker.ietf.org/doc/html/rfc6749#appendix-B):
 *
 *  - **`code`:**
 *    **REQUIRED.** The authorization code generated by the authorization server. The authorization
 *    code **MUST** expire shortly after it is issued to mitigate the risk of leaks. A maximum
 *    authorization code lifetime of 10 minutes is **RECOMMENDED**. The client **MUST NOT** use the
 *    authorization code more than once. If an authorization code is used more than once, the
 *    authorization server **MUST** deny the request and **SHOULD** revoke (when possible) all
 *    tokens previously issued based on that authorization code. The authorization code is bound to
 *    the client identifier and redirection URI.
 *
 *  - **`state`:**
 *    **REQUIRED** if the `state` parameter was present in the client  authorization request.
 *    The exact value received from the client.
 *
 * For example, the authorization server redirects the user-agent by sending the following
 * HTTP response:
 *
 * ```http
 * HTTP/1.1 302 Found
 * Location: https://client.example.com/cb \
 *    ?code=SplxlOBeZQQYbYS6WxSbIA \
 *    &state=xyz
 * ```
 *
 * The client **MUST** ignore unrecognized response parameters. The authorization code string size
 * is left undefined by this specification. The client should avoid making assumptions about code
 * value sizes. The authorization server **SHOULD** document the size of any value it issues.
 *
 * Error Response
 * --------------
 * If the request fails due to a missing, invalid, or mismatching redirection URI, or if the client
 * identifier is missing or invalid, the authorization server **SHOULD** inform the resource owner
 * of the error and **MUST NOT** automatically redirect the user-agent to the invalid
 * redirection URI.
 *
 * If the resource owner denies the access request or if the request fails for reasons other than a
 * missing or invalid redirection URI, the authorization server informs the client by adding the
 * following parameters to the query component of the redirection URI using the
 * `application/x-www-form-urlencoded` format, per
 * [Appendix B](https://datatracker.ietf.org/doc/html/rfc6749#appendix-B):
 *
 *  - **`error`:**
 *    **REQUIRED.** A single [ASCII](https://datatracker.ietf.org/doc/html/rfc6749#ref-USASCII)
 *    error code from the following:
 *
 *    - **`invalid_request`:**
 *      The request is missing a required parameter, includes an invalid parameter value, includes a
 *      parameter more than once, or is otherwise malformed.
 *    - **`unauthorized_client`:**
 *      The client is not authorized to request an authorization code using this method.
 *
 *    - **`access_denied`:**
 *      The resource owner or authorization server denied the request.
 *
 *    - **`unsupported_response_type`:**
 *      The authorization server does not support obtaining an authorization code using this method.
 *
 *    - **`invalid_scope`:**
 *      The requested scope is invalid, unknown, or malformed.
 *
 *    - **`server_error`:**
 *      The authorization server encountered an unexpected condition that prevented it from
 *      fulfilling the request (This error code is needed because a `500` Internal Server Error HTTP
 *      status code cannot be returned to the client via an HTTP redirect.)
 *
 *    - **`temporarily_unavailable`:**
 *      The authorization server is currently unable to handle the request due to a temporary
 *      overloading or maintenance of the server. (This error code is needed because a `503` Service
 *      Unavailable HTTP status code cannot be returned to the client via an HTTP redirect.)
 *
 *    Values for the `error` parameter **MUST NOT** include characters outside the set
 *    `%x20-21 / %x23-5B / %x5D-7E`.
 *
 *  - **`error_description`:**
 *       **OPTIONAL.** Human-readable
 *       [ASCII](https://datatracker.ietf.org/doc/html/rfc6749#ref-USASCII) text providing
 *       additional information, used to assist the client developer in understanding the error that
 *       occurred. Values for the `error_description` parameter **MUST NOT** include characters
 *       outside the set `%x20-21 / %x23-5B / %x5D-7E`.
 *
 *  - **`error_uri`:**
 *       **OPTIONAL.** A URI identifying a human-readable web page with information about the error,
 *       used to provide the client developer with additional information about the error.
 *       Values for the `error_uri` parameter **MUST** conform to the URI-reference syntax and thus
 *       **MUST NOT** include characters outside the set `%x21 / %x23-5B / %x5D-7E`.
 *
 *  - **`state`:**
 *       **REQUIRED** if a `state` parameter was present in the client authorization request.
 *       The exact value received from the client.
 *
 * For example, the authorization server redirects the user-agent by sending the following
 * HTTP response:
 *
 * ```http
 * HTTP/1.1 302 Found
 * Location: https://client.example.com/cb \
 *    ?error=access_denied \
 *    &state=xyz
 * ```
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-3.1 RFC 6749, Section 3.1
 */
export async function handleAuthorizationRequest<
  T extends AuthorizationServerOptions,
>(
  request: Request,
  {
    grantOptions: { ttl = 300, storeAuthorizationCode },
    options,
    userIdentifier,
  }: {
    grantOptions: AuthorizationCodeGrantOptions;
    options: T;
    userIdentifier: string;
  },
): Promise<Response> {
  const url = new URL(request.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());
  let params: Awaited<ReturnType<typeof authorize<T>>>;

  try {
    params = await authorize(queryParams, options);
  } catch (error) {
    if (error instanceof OAuthAuthorizationError) {
      const { response } = error;

      return response;
    }

    throw error;
  }

  // region Issue the authorization code
  const { clientId, challenge, challengeMethod, scopes, redirectUri, state } =
    params;
  const { code } = await storeAuthorizationCode({
    clientId,
    challenge,
    challengeMethod,
    redirectUri,
    scopes,
    ttl,
    userIdentifier,
  });

  return redirectResponse(redirectUri, { code, state, iss: options.issuer });
  // endregion
}

/**
 * Pushed Authorization Request Endpoint
 * =====================================
 * The pushed authorization request endpoint is an HTTP API at the authorization server that accepts
 * HTTP `POST` requests with parameters in the HTTP request message body using the
 * `application/x-www-form-urlencoded` format. This format has a character encoding of UTF-8, as
 * described in [Appendix B of RFC 6749](https://www.rfc-editor.org/rfc/rfc6749#appendix-B). The PAR
 * endpoint URL **MUST** use the `https` scheme.
 *
 * Authorization servers supporting PAR **SHOULD** include the URL of their pushed authorization
 * request endpoint in their authorization server metadata document
 * ([RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414)) using the
 * `pushed_authorization_request_endpoint` parameter as defined in
 * [Section 5](https://datatracker.ietf.org/doc/html/rfc9126#as_metadata).
 *
 * The endpoint accepts the authorization request parameters defined in
 * [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) for the authorization endpoint as well
 * as all applicable extensions defined for the authorization endpoint. Some examples of such
 * extensions include Proof Key for Code Exchange (PKCE)
 * ([RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)), Resource Indicators
 * ([RFC 8707](https://datatracker.ietf.org/doc/html/rfc8707)), and OpenID Connect
 * ([OIDC](http://openid.net/specs/openid-connect-core-1_0.html)). The endpoint **MAY** also support
 * sending the set of authorization request parameters as a Request Object according to
 * [RFC 9101](https://datatracker.ietf.org/doc/html/rfc9101) and
 * [Section 3](https://datatracker.ietf.org/doc/html/rfc9126#request_parameter) of this document.
 *
 * The rules for client authentication as defined in
 * [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) for token endpoint requests, including
 * the applicable authentication methods, apply for the PAR endpoint as well. If applicable, the
 * `token_endpoint_auth_method` client metadata parameter
 * ([RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591)) indicates the registered
 * authentication method for the client to use when making direct requests to the authorization
 * server, including requests to the PAR endpoint. Similarly, the
 * `token_endpoint_auth_methods_supported` authorization server metadata
 * ([RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414)) parameter lists client authentication
 * methods supported by the authorization server when accepting direct requests from clients,
 * including requests to the PAR endpoint.
 *
 * Due to historical reasons, there is potential ambiguity regarding the appropriate audience value
 * to use when employing JWT client assertion-based authentication (defined in
 * [Section 2.2 of RFC 7523](https://datatracker.ietf.org/doc/html/rfc7523#section-2.2) with
 * `private_key_jwt` or `client_secret_jwt` authentication method names per
 * [Section 9 of OIDC](https://openid.net/specs/openid-connect-core-1_0.html#ClientAuthentication)).
 * To address that ambiguity, the issuer identifier URL of the authorization server according to
 * [RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414) **SHOULD** be used as the value of the
 * audience. In order to facilitate interoperability, the authorization server **MUST** accept its
 * issuer identifier, token endpoint URL, or pushed authorization request endpoint URL as values that
 * identify it as an intended audience.
 *
 * Request
 * -------
 * A client sends the parameters that comprise an authorization request directly to the PAR
 * endpoint. A typical parameter set might include: `client_id`, `response_type`, `redirect_uri`,
 * `scope`, `state`, `code_challenge`, and `code_challenge_method` as shown in the example below.
 * However, the pushed authorization request can be composed of any of the parameters applicable for
 * use at the authorization endpoint, including those defined in
 * [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) as well as all applicable extensions.
 * The `request_uri` authorization request parameter is one exception, and it **MUST NOT**
 * be provided.
 *
 * The request also includes, as appropriate for the given client, any additional parameters
 * necessary for client authentication (e.g., `client_secret` or `client_assertion` and
 * `client_assertion_type`). Such parameters are defined and registered for use at the token endpoint
 * but are applicable only for client authentication. When present in a pushed authorization
 * request, they are relied upon only for client authentication and are not germane to the
 * authorization request itself. Any token endpoint parameters that are not related to client
 * authentication have no defined meaning for a pushed authorization request. The `client_id`
 * parameter is defined with the same semantics for both authorization requests and requests to the
 * token endpoint; as a required authorization request parameter, it is similarly required in a
 * pushed authorization request.
 *
 * The client constructs the message body of an HTTP `POST` request with parameters formatted with
 * `x-www-form-urlencoded` using a character encoding of UTF-8, as described in
 * [Appendix B of RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#appendix-B).
 * If applicable, the client also adds its authentication credentials to the request header or the
 * request body using the same rules as for token endpoint requests.
 *
 * This is illustrated by the following example (extra line breaks in the message body for display
 * purposes only):
 *
 * ```http
 * POST /as/par HTTP/1.1
 * Host: as.example.com
 * Content-Type: application/x-www-form-urlencoded
 *
 * response_type=code&state=af0ifjsldkj&client_id=s6BhdRkqt3
 * &redirect_uri=https%3A%2F%2Fclient.example.org%2Fcb
 * &code_challenge=K2-ltc83acc4h0c9w6ESC_rEMTJ3bww-uCHaoeK1t8U
 * &code_challenge_method=S256&scope=account-information
 * &client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer
 * &client_assertion=eyJraWQiOiJrMmJkYyIsImFsZyI6IlJTMjU2In0.eyJpc3Mi
 *  OiJzNkJoZFJrcXQzIiwic3ViIjoiczZCaGRSa3F0MyIsImF1ZCI6Imh0dHBzOi8vc
 *  2VydmVyLmV4YW1wbGUuY29tIiwiZXhwIjoxNjI1ODY5Njc3fQ.te4IdnP_DK4hWrh
 *  TWA6fyhy3fxlAQZAhfA4lmzRdpoP5uZb-E90R5YxzN1YDA8mnVdpgj_Bx1lG5r6se
 *  f5TlckApA3hahhC804dcqlE4naEmLISmN1pds2WxTMOUzZY8aKKSDzNTDqhyTgE-K
 *  dTb3RafRj7tdZb09zWs7c_moOvfVcQIoy5zz1BvLQKW1Y8JsYvdpu2AvpxRPbcP8W
 *  yeW9B6PL6_fy3pXYKG3e-qUcvPa9kan-mo9EoSgt-YTDQjK1nZMdXIqTluK9caVJE
 *  RWW0fD1Y11_tlOcJn-ya7v7d8YmFyJpkhZfm8x1FoeH0djEicXTixEkdRuzsgUCm6
 *  GQ
 * ```
 *
 * The authorization server **MUST** process the request as follows:
 *  1. Authenticate the client in the same way as at the token endpoint
 *     ([Section 2.3 of RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3)).
 *  2. Reject the request if the `request_uri` authorization request parameter is provided.
 *  3. Validate the pushed request as it would an authorization request sent to the authorization
 *     endpoint. For example, the authorization server checks whether the redirect URI matches one
 *     of the redirect URIs configured for the client and also checks whether the client is
 *     authorized for the scope for which it is requesting access. This validation allows the
 *     authorization server to refuse unauthorized or fraudulent requests early. The authorization
 *     server **MAY** omit validation steps that it is unable to perform when processing the pushed
 *     request; however, such checks **MUST** then be performed when processing the authorization
 *     request at the authorization endpoint.
 *
 * The authorization server **MAY** allow clients with authentication credentials to establish
 * per-authorization-request redirect URIs with every pushed authorization request. Described in
 * more detail in [Section 2.4](https://datatracker.ietf.org/doc/html/rfc9126#redirect_uri_mgmt),
 * this is possible since, in contrast to [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749),
 * this specification gives the authorization server the ability to authenticate clients and validate
 * client requests before the actual authorization request is performed.
 *
 * Successful Response
 * -------------------
 * If the verification is successful, the server **MUST** generate a request URI and provide it in
 * the response with a `201` HTTP status code. The following parameters are included as top-level
 * members in the message body of the HTTP response using the `application/json` media type as
 * defined by [RFC 8259](https://datatracker.ietf.org/doc/html/rfc8259).
 *
 *  - **`request_uri`:**
 *    The request URI corresponding to the authorization request posted. This URI is a single-use
 *    reference to the respective request data in the subsequent authorization request. The way the
 *    authorization process obtains the authorization request data is at the discretion of the
 *    authorization server and is out of scope of this specification. There is no need to make the
 *    authorization request data available to other parties via this URI.
 *  - **`expires_in`:**
 *    A JSON number that represents the lifetime of the request URI in seconds as a positive
 *    integer. The request URI lifetime is at the discretion of the authorization server but will
 *    typically be relatively short (e.g., between 5 and 600 seconds).
 *
 * The format of the `request_uri` value is at the discretion of the authorization server, but it
 * **MUST** contain some part generated using a cryptographically strong pseudorandom algorithm such
 * that it is computationally infeasible to predict or guess a valid value (see
 * [Section 10.10 of RFC 6749](https://www.rfc-editor.org/rfc/rfc6749#section-10.10) for specifics).
 * The authorization server **MAY** construct the `request_uri` value using the form
 * `urn:ietf:params:oauth:request_uri:<reference-value>` with `<reference-value>` as the random part
 * of the URI that references the respective authorization request data.
 *
 * The `request_uri` value **MUST** be bound to the client that posted the authorization request.
 *
 * The following is an example of such a response:
 *
 * ```http
 * HTTP/1.1 201 Created
 * Content-Type: application/json
 * Cache-Control: no-cache, no-store
 *
 * {
 *  "request_uri": "urn:ietf:params:oauth:request_uri:6esc_11ACC5bwc014ltc14eY22c",
 *  "expires_in": 60
 * }
 * ```
 *
 * Error Response
 * --------------
 * The authorization server returns an error response with the same format as is specified for error
 * responses from the token endpoint in
 * [Section 5.2 of RFC 6749](https://www.rfc-editor.org/rfc/rfc6749#section-5.2) using the
 * appropriate error code from therein or from
 * [Section 4.1.2.1 of RFC 6749](https://www.rfc-editor.org/rfc/rfc6749#section-4.1.2.1).
 * In those cases where
 * [Section 4.1.2.1 of RFC 6749](https://www.rfc-editor.org/rfc/rfc6749#section-4.1.2.1) prohibits
 * automatic redirection with an error back to the requesting client and hence doesn't define an
 * error code (for example, when the request fails due to a missing, invalid, or mismatching
 * redirection URI), the `invalid_request` error code can be used as the default error code.
 * Error codes defined by the OAuth extension can also be used when such an extension is involved in
 * the initial processing of the authorization request that was pushed. Since initial processing of
 * the pushed authorization request does not involve resource owner interaction, error codes related
 * to user interaction, such as `consent_required` defined by
 * [OIDC](http://openid.net/specs/openid-connect-core-1_0.html), are never returned.
 *
 * If the client is required to use signed Request Objects, by either the authorization server or
 * the client policy (see
 * [RFC 9101, Section 10.5](https://www.rfc-editor.org/rfc/rfc9101#section-10.5)), the authorization
 * server **MUST** only accept requests complying with the definition given in
 * [Section 3](https://datatracker.ietf.org/doc/html/rfc9126#request_parameter) and **MUST** refuse
 * any other request with HTTP status code `400` and error code `invalid_request`.
 *
 * In addition to the above, the PAR endpoint can also make use of the following HTTP status codes:
 *
 *  - **`405`**:
 *    If the request did not use the `POST` method, the authorization server responds with an HTTP
 *    `405` (Method Not Allowed) status code.
 *  - **`413`**:
 *    If the request size was beyond the upper bound that the authorization server allows, the
 *    authorization server responds with an HTTP `413` (Payload Too Large) status code.
 *  - **`429`**:
 *    If the number of requests from a client during a particular time period exceeds the number the
 *    authorization server allows, the authorization server responds with an HTTP `429` (Too Many
 *    Requests) status code.
 *
 * The following is an example of an error response from the PAR endpoint:
 *
 * ```http
 * HTTP/1.1 400 Bad Request
 * Content-Type: application/json
 * Cache-Control: no-cache, no-store
 *
 * {
 *   "error": "invalid_request",
 *   "error_description": "The redirect_uri is not valid for the given client"
 * }
 * ```
 *
 * @see https://datatracker.ietf.org/doc/html/rfc9126#section-2 RFC 9126, Section 2
 */
export async function handlePushedAuthorizationRequest<
  T extends Entities.Client = Entities.Client,
  O extends AuthorizationServerOptions<T> = AuthorizationServerOptions<T>,
>(request: Request, options: O): Promise<Response> {
  // region Validate the authorization request
  if (!options.pushedAuthorizationRequests) {
    throw new OAuthError(
      "invalid_request",
      "The authorization server does not support pushed authorization requests",
    );
  }

  const params = await parseRequestBody(request);

  // "Reject the request if the request_uri authorization request parameter is provided."
  // See https://datatracker.ietf.org/doc/html/rfc9126#section-2.1-7.2
  if ("request_uri" in params) {
    throw new OAuthError(
      "invalid_request",
      "The request_uri parameter is not allowed",
    );
  }

  const {
    responseType,
    clientId,
    challenge,
    challengeMethod,
    scopes,
    redirectUri,
    state,
  } = await authorize(params, options, true);
  // endregion

  // region Store the authorization request
  const { identifier, expires_at } =
    await options.pushedAuthorizationRequests.storeAuthorizationRequest({
      clientId,
      challenge,
      challengeMethod,
      redirectUri: redirectUri.toString(),
      responseType,
      scopes,
      state,
      ttl: options.pushedAuthorizationRequests.ttl ?? 60,
    });

  // "The authorization server MAY construct the request_uri value using the form
  // urn:ietf:params:oauth:request_uri:<reference-value> with <reference-value> as the random part
  // of the URI that references the respective authorization request data."
  // See https://datatracker.ietf.org/doc/html/rfc9126#section-2.2
  const requestUri = `urn:ietf:params:oauth:request_uri:${identifier}`;
  // endregion

  return jsonResponse(
    {
      request_uri: requestUri,
      expires_in: timeOffset(expires_at),
    },
    {
      status: 201,
      headers: { "Cache-Control": "no-cache, no-store" },
    },
  );
}

async function authorize<T extends AuthorizationServerOptions>(
  data: Record<string, unknown>,
  options: T,
  allowAuthorizationRequest = false,
) {
  if (!options.authorizationCode) {
    throw new OAuthError(
      "invalid_request",
      "The authorization code grant is not enabled on this server",
    );
  }

  // region Validate Client ID and Redirect URI
  const initialPayload = z
    .object({
      client_id: z.string({
        invalid_type_error: "The client ID is invalid",
        required_error: "The client ID is missing",
      }),
      redirect_uri: z
        .string({
          invalid_type_error: "The redirect URI is invalid",
          required_error: "The redirect URI is missing",
        })
        .url({ message: "The redirect URI is not a valid URI" })
        .superRefine((uri, context) => {
          // Localhost URIs are allowed for development purposes
          if (uri.startsWith("http://localhost")) {
            return;
          }

          // Private-use URIs are allowed for native client scenarios, where the request will
          // never leave the device
          if (uri.match(/^[a-z][a-z0-9.-]\.[a-z][a-z0-9.-]:\/.+/)) {
            return;
          }

          if (!uri.startsWith("https://")) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: "The redirect URI must use HTTPS",
            });
          }
        }),
      state: z.string().optional(),
      request_uri: z
        .string({ message: "The request URI is invalid" })
        .url({ message: "The request URI is not a valid URI" })
        .optional()
        .refine(
          (uri) =>
            !(uri && !uri.startsWith("urn:ietf:params:oauth:request_uri:")),
          {
            message:
              'The request URI must use the "urn:ietf:params:oauth:request_uri" URN scheme',
          },
        )
        .transform((uri) =>
          uri?.replace("urn:ietf:params:oauth:request_uri:", ""),
        ),
    })
    .safeParse(data);

  // If validation of either client ID or redirect URI fails, we'll show the plain error message
  // in the browser; while this isn't all too pleasant for the user, it's necessary to prevent a
  // Colibri instance from being used as an open relay: You could simply redirect users to any
  // malicious URL by setting it as an invalid redirect URI otherwise.
  if (!initialPayload.success) {
    const issue = initialPayload.error.issues.shift()!;

    throw new OAuthError("invalid_request", issue.message);
  }
  // endregion

  // region Handle PAR Authorization Requests
  if (initialPayload.data.request_uri) {
    if (!allowAuthorizationRequest || !options.pushedAuthorizationRequests) {
      throw new OAuthError(
        "invalid_request",
        "Pushed authorization requests are not enabled on this server",
      );
    }

    try {
      const authorizationRequest =
        await options.pushedAuthorizationRequests.loadAuthorizationRequest(
          initialPayload.data.request_uri,
        );

      if (
        !authorizationRequest ||
        authorizationRequest.expires_at <= new Date()
      ) {
        throw new OAuthError(
          "invalid_request",
          "The request URI is unknown or expired",
        );
      }

      const {
        client_id: clientId,
        code_challenge: challenge,
        code_challenge_method: challengeMethod,
        redirect_uri: redirectUri,
        response_type: responseType,
        scopes,
        state,
      } = authorizationRequest;

      return {
        clientId,
        challenge,
        challengeMethod,
        redirectUri,
        responseType,
        scopes: scopes ?? [],
        state: state ?? undefined,
      };
    } catch (cause) {
      throw new OAuthError("server_error", undefined, undefined, { cause });
    }
  }
  // endregion

  // region Validate Client
  const {
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  } = initialPayload.data;
  const client = await resolveClient(clientId, options);

  if (!client.redirect_uris) {
    throw new OAuthError(
      "invalid_client",
      "The client is confidential and does not support the authorization_code grant",
    );
  }

  if (!client.redirect_uris.includes(redirectUri)) {
    throw new OAuthError(
      "invalid_request",
      "The redirect URI is missing or invalid",
    );
  }
  // endregion

  // region Validate Authorization Request Parameters
  const responseTypesSupported = options.authorizationCode
    .responseTypesSupported as [ResponseType, ...ResponseType[]];
  const codeChallengeMethodsSupported = options.authorizationCode
    .codeChallengeMethodsSupported as [
    PkceCodeChallengeMethod,
    ...PkceCodeChallengeMethod[],
  ];
  const payload = await z
    .object({
      response_type: z.enum(responseTypesSupported, {
        invalid_type_error: "The response type is unknown or unsupported",
        required_error: "The response type is missing",
      }),
      code_challenge: z.string({
        message: "A PKCE code challenge is required",
      }),
      code_challenge_method: z.enum(codeChallengeMethodsSupported, {
        invalid_type_error:
          "The code challenge method is unknown or unsupported",
        required_error: "The code challenge method is missing",
      }),
      scope: z
        .string({ message: "The scope is missing" })
        .transform((scope) => scope.split(" "))
        .pipe(
          options.scopeSchema ??
            z.string({ message: "The scope is invalid" }).array(),
        ),
    })
    .safeParseAsync(data);

  if (!payload.success) {
    const issue = payload.error.issues.shift()!;
    const field = issue.path[0]!.toString();

    if (
      field === "response_type" &&
      issue.code === z.ZodIssueCode.invalid_enum_value
    ) {
      throw new OAuthAuthorizationError(
        "unsupported_response_type",
        redirectUri,
        options.issuer,
        state,
        issue.message,
      );
    }

    if (field === "scope" && issue.code === z.ZodIssueCode.invalid_string) {
      throw new OAuthAuthorizationError(
        "invalid_scope",
        redirectUri,
        options.issuer,
        state,
        issue.message,
      );
    }

    throw new OAuthAuthorizationError(
      "invalid_request",
      redirectUri,
      options.issuer,
      state,
      issue.message,
    );
  }
  // endregion

  const {
    code_challenge: challenge,
    code_challenge_method: challengeMethod,
    response_type: responseType,
    scope: requestedScopes,
  } = payload.data;

  // region Validate Scopes
  let scopes: string[];

  try {
    scopes = await resolveScopes(client, requestedScopes, options);
  } catch (error) {
    if (error instanceof OAuthError) {
      throw new OAuthAuthorizationError(
        error.code,
        redirectUri,
        options.issuer,
        state,
        error.description,
        error.uri,
      );
    }

    throw new OAuthAuthorizationError(
      "invalid_scope",
      redirectUri,
      options.issuer,
      state,
      "The scope is invalid",
    );
  }
  // endregion

  return {
    clientId: client.id,
    challenge,
    challengeMethod,
    redirectUri,
    responseType,
    scopes,
    state,
  };
}

async function validateCodeVerifier(
  verifier: string,
  challenge: string,
  method: string,
) {
  switch (method) {
    case "plain":
      return verifier === challenge;

    case "S256":
      const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(verifier),
      );
      const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      return base64 === challenge;

    default:
      throw new OAuthError(
        "invalid_request",
        `Unsupported code challenge method: ${method}`,
      );
  }
}
