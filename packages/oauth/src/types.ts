import type { MaybePromise } from "@colibri-hq/shared";
import type { ClientCredentialsGrantOptions } from "./grantTypes/clientCredentialsGrant";
import type { RefreshTokenGrantOptions } from "./grantTypes/refreshTokenGrant";
import type { AuthorizationCodeGrantOptions } from "./grantTypes/authorizationCodeGrant";
import type { DeviceCodeGrantOptions } from "./grantTypes/deviceCodeGrant";
import { z } from "zod";

// region Specification
/**
 * **OAuth 2.0 Authorization Server Metadata**
 *
 * This specification defines a metadata format that an OAuth 2.0 client can use to obtain the
 * information needed to interact with an OAuth 2.0 authorization server, including its endpoint
 * locations and authorization server capabilities.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc8414|RFC 8414
 */
export interface AuthorizationServerMetadata {
  /**
   * **REQUIRED.** The authorization server's issuer identifier, which is a URL that uses the
   * `https` scheme and has no query or fragment components. Authorization server metadata is
   * published at a location that is `.well-known` according to
   * [RFC 5785](https://datatracker.ietf.org/doc/html/rfc5785) derived from this issuer identifier,
   * as described in [Section 3](https://datatracker.ietf.org/doc/html/rfc8414#section-3).
   * The issuer identifier is used to prevent authorization server mix-up attacks, as described
   * in [OAuth 2.0 Mix-Up Mitigation](https://datatracker.ietf.org/doc/html/rfc8414#ref-MIX-UP).
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   */
  issuer: `https://${string}` | URL;

  /**
   * URL of the authorization server's token endpoint as per
   * [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749).
   * This is **REQUIRED**.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   */
  token_endpoint: `https://${string}` | URL;

  /**
   * **REQUIRED.** JSON array containing a list of the OAuth 2.0 `response_type` values that this
   * authorization server supports.
   * The array values used are the same as those used with the `response_types` parameter defined by
   * OAuth 2.0 [Dynamic Client Registration Protocol](https://datatracker.ietf.org/doc/html/rfc7591).
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   * @see https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml#endpoint IANA
   *      OAuth Parameters Registry: OAuth Authorization Endpoint Response Types
   */
  response_types_supported: ResponseType[];

  /**
   * **OPTIONAL.** JSON array containing a list of the OAuth 2.0 grant type values that this
   * authorization server supports. The array values used are the same as those used with the
   * `grant_types` parameter defined by OAuth 2.0 Dynamic Client Registration Protocol
   * ([RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591)). If omitted, the default value is
   * `["authorization_code"]`.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   */
  grant_types_supported?: OAuthGrantType[] | undefined;

  /**
   * URL of the authorization server's authorization endpoint as per
   * [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749).
   * This is **REQUIRED** unless no grant types are supported that use the authorization endpoint.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   */
  authorization_endpoint?: `https://${string}` | URL | undefined;

  /**
   * **OPTIONAL.** URL of the authorization server's
   * [JWK Set document](https://datatracker.ietf.org/doc/html/rfc8414#ref-JWK).
   * The referenced document contains the signing key(s) the client uses to validate signatures from
   * the authorization server. This URL **MUST** use the `https` scheme. The JWK Set **MAY** also
   * contain the server's encryption key or keys, which are used by clients to encrypt requests to
   * the server. When both signing and encryption keys are made available, a `use` (public key use)
   * parameter value is **REQUIRED** for all keys in the referenced JWK Set to indicate each key's
   * intended usage.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   */
  jwks_uri?: `https://${string}` | URL | undefined;

  /**
   * **OPTIONAL.** URL of the authorization server's OAuth 2.0 Dynamic Client Registration endpoint
   * ([RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591)).
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   */
  registration_endpoint?: `https://${string}` | URL | undefined;

  /**
   * **OPTIONAL.** URL of the authorization server's OAuth 2.0 User Information endpoint
   * ([OpenID](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)).
   *
   * @see https://openid.net/specs/openid-connect-core-1_0.html#UserInfo OpenID Connect Core 1.0:
   *      UserInfo Endpoint
   */
  userinfo_endpoint?: `https://${string}` | URL | undefined;

  /**
   * **RECOMMENDED.** JSON array containing a list of the OAuth 2.0
   * [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) `scope` values that this
   * authorization server supports.
   * Servers **MAY** choose not to advertise some supported scope values even when this parameter
   * is used.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   */
  scopes_supported?: string[] | undefined;

  /**
   * **OPTIONAL.** JSON array containing a list of the OAuth 2.0 `response_mode` values that this
   * authorization server supports, as specified
   * in OAuth 2.0 Multiple  Response Type Encoding Practices
   * ([RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414#ref-OAuth.Responses)).
   * If omitted, the default is `["query", "fragment"]`. The response mode value `form_post` is also
   * defined in OAuth 2.0 Form Post Response Mode
   * ([RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414#ref-OAuth.Post).
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   */
  response_modes_supported?: ResponseMode[] | undefined;

  /**
   * **OPTIONAL.** JSON array containing a list of client authentication methods supported by this
   * token endpoint. Client authentication method values are used in the
   * `token_endpoint_auth_method` parameter defined in
   * [Section 2 of RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591#section-2).
   * If omitted, the default is `client_secret_basic` — the HTTP Basic Authentication Scheme
   * specified in
   * [Section 2.3.1 of RFC 6749](https://datatracker.ietf.org/doc/html/rfc8414#section-2.3.1).
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   * @see https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml#token-endpoint-auth-method IANA
   *      OAuth Parameters Registry: Token Endpoint Authentication Methods
   */
  token_endpoint_auth_methods_supported?:
    | TokenEndpointAuthenticationMethod[]
    | undefined;

  /**
   * **OPTIONAL.** JSON array containing a list of the JWS signing algorithms (`alg` values)
   * supported by the token endpoint for the signature on the
   * [JWT](https://datatracker.ietf.org/doc/html/rfc8414#ref-JWT) used to authenticate the client at
   * the token endpoint for the `private_key_jwt` and `client_secret_jwt` authentication methods.
   * This metadata entry **MUST** be present if either of these authentication methods are specified
   * in the `token_endpoint_auth_methods_supported` entry. No default algorithms are implied if this
   * entry is omitted. Servers **SHOULD** support `RS256`. The value `none` **MUST NOT** be used.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   * @see https://datatracker.ietf.org/doc/html/rfc7519#section-8 RFC 7519, Section 8
   * @see https://datatracker.ietf.org/doc/html/rfc7518#autoid-5 RFC 7518
   */
  token_endpoint_auth_signing_alg_values_supported?:
    | JwtSigningAlgorithm[]
    | undefined;

  /**
   * **OPTIONAL.** URL of a page containing human-readable information that developers might want or
   * need to know when using the authorization server. If the authorization server does not support
   * Dynamic Client Registration, then information on how to register clients needs to be provided
   * in this documentation.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   */
  service_documentation?: `https://${string}` | URL | undefined;

  /**
   * **OPTIONAL.** Languages and scripts supported for the user interface, represented as a JSON
   * array of language tag values from BCP 47
   * ([RFC 5646](https://datatracker.ietf.org/doc/html/bcp47)). If omitted, the set of supported
   * languages and scripts is unspecified.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   */
  ui_locales_supported?: string[] | undefined;

  /**
   * **OPTIONAL.** URL that the authorization server provides to the person registering the client
   * to read about the authorization server's requirements on how the client can use the data #
   * provided by the authorization server. The registration process **SHOULD** display this URL to
   * the person registering the client if it is given. As described in
   * [Section 5](https://datatracker.ietf.org/doc/html/rfc8414#section-5), despite the identifier
   * `op_policy_uri` appearing to be OpenID-specific, its usage in this specification is actually
   * referring to a general OAuth 2.0 feature that is not specific to OpenID Connect.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   */
  op_policy_uri?: `https://${string}` | URL | undefined;

  /**
   * **OPTIONAL.** URL that the authorization server provides to the person registering the client
   * to read about the authorization server's terms of service. The registration process **SHOULD**
   * display this URL to the person registering the client if it is given. As described in
   * [Section 5](https://datatracker.ietf.org/doc/html/rfc8414#section-5), despite the identifier
   * `op_tos_uri` appearing to be OpenID-specific, its usage in this specification is actually
   * referring to a general OAuth 2.0 feature that is not specific to OpenID Connect.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   */
  op_tos_uri?: `https://${string}` | URL | undefined;

  /**
   * **OPTIONAL.** URL of the authorization server's OAuth 2.0 Revocation Endpoint
   * ([RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009)).
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   */
  revocation_endpoint?: `https://${string}` | URL | undefined;

  /**
   * **OPTIONAL.** JSON array containing a list of client authentication methods supported by this
   * revocation endpoint. The valid client authentication method values are those registered in the
   * IANA OAuth Token Endpoint Authentication Methods registry
   * ([RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414#ref-IANA.OAuth.Parameters)).
   * If omitted, the default is `client_secret_basic` — the HTTP Basic Authentication Scheme
   * specified in
   * [Section 2.3.1 of RFC8414](https://datatracker.ietf.org/doc/html/rfc8414#section-2.3.1).
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   * @see https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml#token-endpoint-auth-method IANA
   *      OAuth Parameters Registry: Token Endpoint Authentication Methods
   */
  revocation_endpoint_auth_methods_supported?:
    | TokenEndpointAuthenticationMethod[]
    | undefined;

  /**
   * **OPTIONAL.** JSON array containing a list of the JWS signing algorithms (`alg` values)
   * supported by the revocation endpoint for the signature on the
   * [JWT](https://datatracker.ietf.org/doc/html/rfc8414#ref-JWT) used to authenticate the client at
   * the revocation endpoint for the `private_key_jwt` and `client_secret_jwt` authentication
   * methods. This metadata entry **MUST** be present if either of these authentication methods are
   * specified in the `revocation_endpoint_auth_methods_supported` entry. No default
   * algorithms are implied if this entry is omitted. The value `none` **MUST NOT** be used.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   * @see https://datatracker.ietf.org/doc/html/rfc7519#section-8 RFC 7519, Section 8
   * @see https://datatracker.ietf.org/doc/html/rfc7518#autoid-5 RFC 7518
   */
  revocation_endpoint_auth_signing_alg_values_supported?:
    | JwtSigningAlgorithm[]
    | undefined;

  /**
   * **OPTIONAL.** URL of the authorization server's OAuth 2.0 Introspection Endpoint
   * ([RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662)).
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   */
  introspection_endpoint?: `https://${string}` | URL | undefined;

  /**
   * **OPTIONAL.** JSON array containing a list of client authentication methods supported by this
   * introspection endpoint. The valid client authentication method values are those registered in
   * the IANA OAuth Token Endpoint Authentication Methods registry
   * ([RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414#ref-IANA.OAuth.Parameters)) or those
   * registered in the IANA OAuth Access Token Types registry
   * ([RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414#ref-IANA.OAuth.Parameters)) (These
   * values are and will remain distinct, due to Section 7.2.) If omitted, the set of supported
   * authentication methods **MUST** be determined by other means.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   * @see https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml#token-types IANA
   *      OAuth Parameters Registry: OAuth Access Token Types
   */
  introspection_endpoint_auth_methods_supported?:
    | TokenEndpointAuthenticationMethod[]
    | undefined;

  /**
   * **OPTIONAL.** JSON array containing a list of the JWS signing algorithms (`alg` values)
   * supported by the introspection endpoint for the signature on the
   * [JWT](https://datatracker.ietf.org/doc/html/rfc8414#ref-JWT) used to authenticate the client at
   * the introspection endpoint for the `private_key_jwt` and `client_secret_jwt` authentication
   * methods. This metadata entry **MUST** be present if either of these authentication methods are
   * specified in the `introspection_endpoint_auth_methods_supported` entry. No default algorithms
   * are implied if this entry is omitted. The value `none` **MUST NOT** be used.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   * @see https://datatracker.ietf.org/doc/html/rfc7519#section-8 RFC 7519, Section 8
   * @see https://datatracker.ietf.org/doc/html/rfc7518#autoid-5 RFC 7518
   */
  introspection_endpoint_auth_signing_alg_values_supported?:
    | JwtSigningAlgorithm[]
    | undefined;

  /**
   * **OPTIONAL.** JSON array containing a list of Proof Key for Code Exchange (PKCE)
   * ([RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636) code challenge methods supported by
   * this authorization server. Code challenge method values are used in the `code_challenge_method`
   * parameter defined in
   * [Section 4.3 of RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636#section-4.3). The valid
   * code challenge method values are those registered in the IANA PKCE Code Challenge Methods
   * registry ([RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414#ref-IANA.OAuth.Parameters)).
   * If omitted, the authorization server does not support PKCE.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2 RFC 8414, Section 2
   * @see https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml#pkce-code-challenge-method IANA OAuth
   *      Parameters Registry: PKCE Code Challenge Methods
   */
  code_challenge_methods_supported?: PkceCodeChallengeMethod[] | undefined;

  /**
   * **OPTIONAL.** URL of the authorization server's device authorization endpoint, as defined
   * in [Section 3.1](https://datatracker.ietf.org/doc/html/rfc8628#section-3.1).
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8628#section-3.1 RFC 8628, Section 3.1
   * @see https://datatracker.ietf.org/doc/html/rfc8628 RFC 8628
   * @see https://datatracker.ietf.org/doc/html/rfc8414 RFC 8414
   */
  device_authorization_endpoint?: `https://${string}` | URL | undefined;

  /**
   * The URL of the pushed authorization request endpoint at which a client can post an
   * authorization request to exchange for a request_uri value usable at the authorization server.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc9126#autoid-11 RFC 9126, Section 5
   * @see https://datatracker.ietf.org/doc/html/rfc9126 RFC 9126
   */
  pushed_authorization_request_endpoint?: `https://${string}` | URL | undefined;

  /**
   * Boolean parameter indicating whether the authorization server accepts authorization request
   * data only via PAR. If omitted, the default value is false.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc9126#autoid-11 RFC 9126, Section 5
   * @see https://datatracker.ietf.org/doc/html/rfc9126 RFC 9126
   */
  require_pushed_authorization_requests?: boolean | undefined;

  /**
   * Whether the authorization server provides the `iss` parameter in the authorization response
   * as defined in
   * [RFC 9207, Section 2](https://datatracker.ietf.org/doc/html/rfc9207#section-2). If omitted,
   * the default value is `false`.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc9207#section-3 RFC 9207, Section 3
   * @see https://datatracker.ietf.org/doc/html/rfc9207 RFC 9207
   */
  authorization_response_iss_parameter_supported?: boolean | undefined;
}

/**
 * **OAuth Authorization Grant Type identifiers as**
 * **per [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)**
 *
 * An authorization grant is a credential representing the resource owner's authorization (to access
 * its protected resources) used by the client to obtain an access token.  This specification
 * defines four grant types—authorization code, implicit, resource owner password credentials, and
 * client credentials—as well as an extensibility mechanism for defining additional types.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6749 RFC 6749
 * @see https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-4 OAuth 2.1 (Draft)
 * @see https://oauth.net/2/grant-types/ OAuth 2.0 Grant Types
 */
export type OAuthGrantType =
  | "authorization_code"
  | "client_credentials"
  | "refresh_token"
  | "urn:ietf:params:oauth:grant-type:device_code"
  | "urn:ietf:params:oauth:grant-type:token-exchange"
  // | "implicit" // Implicit Grant has been removed in OAuth 2.1
  | "password"; // Resource Owner Password Credentials Grant has been deprecated in RFC 9700

/**
 * OAuth Authorization Endpoint Response Types
 *
 * @see https://www.iana.org/assignments/oauth-parameters/oauth-parameters.xhtml#endpoint
 */
export type ResponseType =
  | "code"
  | "code id_token"
  | "code id_token token"
  | "code token"
  | "id_token"
  | "id_token token"
  | "none"
  | "token";
export type ResponseMode = "query" | "fragment" | "form_post";
export type TokenEndpointAuthenticationMethod =
  | "none"
  | "client_secret_post"
  | "client_secret_basic"
  | "client_secret_jwt"
  | "private_key_jwt"
  | "tls_client_auth"
  | "self_signed_tls_client_auth";
type AccessTokenType = "Bearer" | "N_A" | "PoP" | "DPoP";
export type JwtSigningAlgorithm = "HS256" | "RS256" | "ES256" | "none";
export type PkceCodeChallengeMethod = "plain" | "S256";

export type OAuthErrorCode =
  // The request is missing a parameter so the server can’t proceed with the request. This may also
  // be returned if the request includes an unsupported parameter or repeats a parameter.
  | "invalid_request"

  // Client authentication failed, such as if the request contains an invalid client ID or secret.
  // Send an HTTP 401 response in this case.
  | "invalid_client"

  // The authorization code (or user’s password for the password grant type) is invalid or expired.
  // This is also the error you would return if the redirect URL given in the authorization grant
  // does not match the URL provided in this access token request.
  | "invalid_grant"

  // For access token requests that include a scope (password or client_credentials grants), this
  // error indicates an invalid scope value in the request.
  | "invalid_scope"

  // This client is not authorized to use the requested grant type. For example, if you restrict
  // which applications can use the Implicit grant, you would return this error for the other apps.
  | "unauthorized_client"

  // If a grant type is requested that the authorization server doesn’t recognize, use this code.
  // Note that unknown grant types also use this specific error code rather than using
  // the invalid_request above.
  | "unsupported_grant_type"
  | "server_error"
  | "temporarily_unavailable"
  | "access_denied"
  | "unsupported_response_type"

  // If the device is polling too frequently when using the device code grant
  | "slow_down"

  // If the user has not either allowed or denied the request yet, the authorization server will
  // return the authorization_pending error.
  | "authorization_pending"

  // If the device code is expired
  | "expired_token";

/**
 * **Successful Token Response**
 *
 * The authorization server issues an access token and optional refresh token, and constructs the
 * response by adding the following parameters to the entity-body of the HTTP response with a
 * `200 (OK)` status code.
 *
 * @see RFC 6749, Section 5.1
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-5.1
 */
export interface TokenPayload {
  /**
   * **REQUIRED.** The type of the token issued as described in
   * [Section 7.1](https://datatracker.ietf.org/doc/html/rfc6749#section-7.1).
   * Value is case-insensitive.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc6749#section-5.1
   */
  token_type: AccessTokenType;

  /**
   * **REQUIRED.** The access token issued by the authorization server.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc6749#section-5.1
   */
  access_token: string;

  /**
   * **OPTIONAL.** The refresh token, which can be used to obtain new access tokens using the same
   * authorization grant as described in
   * [Section 6](https://datatracker.ietf.org/doc/html/rfc6749#section-6).
   *
   * For clients using the authorization code grant type, the refresh token will only be included if
   * the `offline_access` scope has been specified in the authorization request.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc6749#section-5.1
   */
  refresh_token?: string | undefined;

  /**
   * **OPTIONAL.** ID Token value associated with the authenticated session.
   *
   * This is only included if the `openid` scope is requested, and will only be included for clients
   * using the authorization code grant type.
   *
   * @see https://openid.net/specs/openid-connect-core-1_0.html#TokenResponse OpenID Connect Core 1.0
   */
  id_token?: string | undefined;

  /**
   * **RECOMMENDED.** The lifetime in seconds of the access token. For example, the value `"3600"`
   * denotes that the access token will expire in one hour from the time the response was generated.
   * If omitted, the authorization server **SHOULD** provide the expiration time via other means or
   * document the default value.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc6749#section-5.1
   */
  expires_in: number;

  /**
   * **OPTIONAL**, if identical to the scope requested by the client; otherwise, **REQUIRED**.
   * The scope of the access token as described by
   * [Section 3.3](https://datatracker.ietf.org/doc/html/rfc6749#section-3.3).
   *
   * @see https://datatracker.ietf.org/doc/html/rfc6749#section-5.1
   */
  scope?: string | undefined;
}

// endregion

// region Entities

/**
 * Entities
 * ========
 * The `Entities` namespace holds all data models used by the Colibri OAuth server.
 *
 * These models are used to store and retrieve data from the persistence layer, and can be used as
 * a reference for all required fields.
 */
export namespace Entities {
  /**
   * Client
   * ======
   * The `Client` interface represents an OAuth 2.0 client application.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc6749#section-2 RFC 6749, Section 2
   */
  export interface Client {
    id: string;
    secret: string | null;
    active: boolean;
    revoked: boolean;
    grant_types?: OAuthGrantType[];
    scopes: string[];
    redirect_uris: string[] | null;
  }

  /**
   * Authorization Code
   * =================
   * The `AuthorizationCode` interface represents an authorization code issued by the server.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc6749#section-1.3 RFC 6749, Section 1.3
   * @see [Authorization Code Grant](import('./grantTypes/authorizationCodeGrant.js').AuthorizationCodeGrant)
   */
  export interface AuthorizationCode {
    code: string;
    client_id: string;
    user_id: string;
    redirect_uri: string;
    expires_at: Date;
    scopes: string[];
    used_at: Date | null;
    challenge: string;
    challenge_method: PkceCodeChallengeMethod;
  }

  /**
   * Authorization Request
   * =====================
   * The `AuthorizationRequest` interface represents a Pushed Authorization Request (PAR) stored
   * on the server for later use.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc9126#section-2 RFC 9126, Section 2
   * @see [Authorization Code Grant](import('./grantTypes/authorizationCodeGrant.js').AuthorizationCodeGrant)
   */
  export interface AuthorizationRequest {
    identifier: string;
    client_id: string;
    code_challenge: string;
    code_challenge_method: string;
    created_at: Date;
    expires_at: Date;
    redirect_uri: string;
    response_type: string;
    scopes: string[] | null;
    state: string | null;
    used_at: Date | null;
  }

  /**
   * Access Token
   * ============
   * The `AccessToken` interface represents an access token issued by the server.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc6749#section-1.4 RFC 6749, Section 1.4
   */
  export interface AccessToken {
    token: string;
    client_id: string;
    user_id: string | null;
    scopes: string[];
    expires_at: Date;
    revoked_at: Date | null;
  }

  /**
   * Refresh Token
   * =============
   * The `RefreshToken` interface represents a refresh token issued by the server.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc6749#section-1.5 RFC 6749, Section 1.5
   * @see [Refresh Token Grant](import('./grantTypes/refreshTokenGrant.js').RefreshTokenGrant)
   */
  export interface RefreshToken {
    token: string;
    client_id: string;
    user_id: string | null;
    scopes: string[];
    expires_at: Date;
    revoked_at: Date | null;
  }

  /**
   * Device Challenge
   * ================
   * The `DeviceChallenge` interface represents a device authorization challenge issued by the
   * server for the device code grant type.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc8628#section-3.1 RFC 8628, Section 3.1
   * @see [Device Code Grant](import('./grantTypes/deviceCodeGrant.js').DeviceCodeGrant)
   */
  export interface DeviceChallenge {
    approved: boolean | null;
    client_id: string;
    device_code: string;
    expires_at: Date;
    last_poll_at: Date | null;
    scopes: string[] | null;
    used_at: Date | null;
    user_code: string;
  }
}

// endregion

// region Token Issuance
export type RequestedToken<
  C extends Record<string, unknown> = Record<string, unknown>,
> = {
  ttl?: number | undefined;

  /**
   * When a grant type exchanges an old token for a new one, the `exchange` property contains the
   * old token to swap for new ones. If present, the token presented must be revoked after the new
   * token is issued.
   */
  exchange?: string | undefined;
  scopes?: string[] | undefined;
  claims?: C | undefined;
};
export type IssueTokensFn = (params: {
  /**
   * The identifier of the client as received in the `client_id` parameter
   */
  clientId: string;

  accessToken?: RequestedToken | undefined;
  refreshToken?: RequestedToken | undefined;
  idToken?:
    | (Omit<RequestedToken, "exchange" | "scopes"> & {
        exchange?: never;
        scopes?: never;
      })
    | undefined;

  /**
   * The scopes requested by the client.
   *
   * This may be a subset of the scopes supported by the server. If the client or user does not have
   * permission to use any of the requested scopes, no error shall be thrown, but the issued access
   * token will only contain the scopes the client is allowed to use.
   */
  scopes: string[];

  /**
   * The identifier of the user, if the token is intended to be associated with a user account.
   * For tokens issued to a client (e.g. during the `client_credentials` grant), this must
   * be `undefined`.
   */
  userIdentifier?: string | undefined;
}) => MaybePromise<PersistedTokensInfo>;

/**
 * Information about the issued tokens returned by the configured {@link IssueTokensFn}
 *
 * @internal
 */
export type PersistedTokensInfo = {
  /**
   * The issued access token.
   */
  accessToken: string;

  /**
   * The issued refresh token. If no refresh token was issued, this must
   * be `undefined`.
   */
  refreshToken?: string | undefined;

  /**
   * The issued ID token. If no ID token was issued, this must
   * be `undefined`.
   */
  idToken?: string | undefined;

  /**
   * The expiration date of the issued access token.
   */
  expiresAt: Date;

  /**
   * The scopes granted to the access token. This may be a subset of the
   * requested scopes.
   */
  scopes: string[];
};
// endregion

// region Server Options

export interface AuthorizationServerOptions<
  Client extends Entities.Client = Entities.Client,
  AccessToken extends Entities.AccessToken = Entities.AccessToken,
  RefreshToken extends Entities.RefreshToken = Entities.RefreshToken,
  DeviceChallenge extends Entities.DeviceChallenge = Entities.DeviceChallenge,
  AuthorizationCode extends
    Entities.AuthorizationCode = Entities.AuthorizationCode,
  AuthorizationRequest extends
    Entities.AuthorizationRequest = Entities.AuthorizationRequest,
> {
  accessTokenTtl?: number;

  /**
   * The issuer URL for JWTs
   */
  issuer: string;
  baseUri?: string | URL;
  policyUri?: string;
  documentationUri?: string;
  termsOfServiceUri?: string;
  jwksUri?: string;

  /**
   * The secret key used to sign JWTs
   */
  jwtSecret: string;

  /**
   * Retrieves a client by its identifier as retrieved from the `client_id` request parameter
   *
   * @param identifier The client identifier
   */
  loadClient: (identifier: string) => MaybePromise<Client | undefined>;

  /**
   * Retrieves an access token by its identifier
   *
   * @param token The access token to retrieve
   */
  loadAccessToken: (token: string) => MaybePromise<AccessToken | undefined>;

  /**
   * Retrieves all scopes supported by the server
   */
  loadScopes: () => MaybePromise<string[]>;

  scopeSchema?: z.Schema<string[], z.ZodTypeDef, string[]>;

  /**
   * Issues tokens for a client
   *
   * This method is called by the grant types to issue tokens. To ensure all persistence operations
   * can be carried out in a single atomic transaction, it receives all parameters needed to issue
   * an access token, a refresh token, and an ID token, at once.
   */
  issueTokens: IssueTokensFn;

  /**
   * The time-to-live (TTL) for refresh tokens in seconds
   */
  refreshTokenTtl?: number;

  /**
   * The time-to-live (TTL) for authorization codes in seconds
   */
  idTokenTtl?: number;
  uiLocalesSupported?: string[];

  token?: TokenEndpointOptions;
  authorizationCode: false | AuthorizationCodeGrantOptions<AuthorizationCode>;
  refreshToken?: false | RefreshTokenGrantOptions<RefreshToken>;
  clientCredentials?: false | ClientCredentialsGrantOptions;
  deviceCode?: false | DeviceCodeGrantOptions<DeviceChallenge>;
  tokenExchange?: false | TokenExchangeGrantOptions;
  pushedAuthorizationRequests?:
    | false
    | PushedAuthorizationRequestOptions<AuthorizationRequest>;
  tokenRevocation?: false | TokenRevocationOptions;
  tokenIntrospection?: false | TokenIntrospectionOptions<AccessToken>;
  serverMetadata?: false | ServerMetadataOptions;
  userInfo?: false | UserInfoOptions;
  clientRegistration?: false | ClientRegistrationOptions;
  clientManagement?: false | ClientManagementOptions;
}

type TokenExchangeGrantOptions = {
  // TODO: Implement token exchange grant type
};

type TokenEndpointOptions = {
  endpoint?: string | URL;
  authMethodsSupported?: TokenEndpointAuthenticationMethod[];
  authSigningAlgValuesSupported?: JwtSigningAlgorithm[];
};

type PushedAuthorizationRequestOptions<
  T extends Entities.AuthorizationRequest = Entities.AuthorizationRequest,
> = {
  loadAuthorizationRequest: (requestUri: string) => MaybePromise<T | undefined>;
  storeAuthorizationRequest: (params: {
    clientId: string;
    challenge: string;
    challengeMethod?: PkceCodeChallengeMethod;
    redirectUri: string;
    responseType: string;
    scopes?: string[] | undefined;
    state?: string | undefined;
    ttl: number;
  }) => MaybePromise<T>;
  ttl?: number;
  endpoint?: string;
  required?: boolean;
};

type TokenRevocationOptions = {
  /**
   * Revokes an access token
   *
   * @param token The access token to revoke
   * @param clientIdentifier Identifier of the client the token was issued to
   */
  revokeAccessToken: (
    token: string,
    clientIdentifier: string,
  ) => MaybePromise<unknown>;

  /**
   * Revokes a refresh token
   *
   * @param token The refresh token to revoke
   * @param clientIdentifier Identifier of the client the token was issued to
   */
  revokeRefreshToken: (
    token: string,
    clientIdentifier: string,
  ) => MaybePromise<unknown>;

  endpoint?: string | URL;
  authMethodsSupported?: TokenEndpointAuthenticationMethod[];
  authSigningAlgValuesSupported?: JwtSigningAlgorithm[];
};

type TokenIntrospectionOptions<T extends Entities.AccessToken> = {
  endpoint?: string | URL;
  authMethodsSupported?: TokenEndpointAuthenticationMethod[];
  authSigningAlgValuesSupported?: JwtSigningAlgorithm[];
};

type ServerMetadataOptions = {
  extraMetadata?: Record<string, unknown>;
};

type UserInfoOptions = {
  endpoint?: string | URL;
};

type ClientRegistrationOptions = {
  endpoint?: string | URL;
};
type ClientManagementOptions = {};

export type PersistenceAdapter<C extends Entities.Client> = {
  /**
   * Retrieves a client by its identifier as retrieved from the `client_id` request parameter
   *
   * @param identifier The client identifier
   * @deprecated
   */
  loadClient: (identifier: string) => MaybePromise<C | undefined>;

  /**
   * Retrieves all scopes supported by the server
   * @deprecated
   */
  loadScopes: () => MaybePromise<string[]>;

  /**
   * Checks if a given scope is valid and supported by the server
   *
   * @param scope The scope to validate
   * @deprecated
   */
  validateScope: (scope: string, clientId?: string) => MaybePromise<boolean>;

  /**
   * Issues tokens for a client
   *
   * This method is called by the grant types to issue tokens. To ensure all persistence operations
   * can be carried out in a single atomic transaction, it receives all parameters needed to issue
   * an access token, a refresh token, and an ID token, at once.
   * @deprecated
   */
  issueTokens: IssueTokensFn;
};
// endregion
