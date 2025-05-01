import type {
  AuthorizationServerMetadata,
  AuthorizationServerOptions,
} from "../types";
import { createAuthorizationServer } from "../server";
import { jsonResponse } from "../utilities";
import { OAuthError } from "../errors";

/**
 * Authorization Server Metadata Endpoint
 * ======================================
 * Authorization servers supporting metadata **MUST** make a JSON document containing metadata as
 * specified in [Section 2](https://datatracker.ietf.org/doc/html/rfc8414#section-2) available at
 * a path formed by inserting a well-known URI string into the authorization server's issuer
 * identifier between the host component and the path component, if any. By default, the
 * well-known URI string used is `/.well-known/oauth-authorization-server`. This path **MUST** use
 * the `https` scheme. The syntax and semantics of `.well-known` are defined in
 * [RFC 5785](https://datatracker.ietf.org/doc/html/rfc5785). The well-known URI suffix used
 * **MUST** be registered in the IANA
 * ["Well-Known URIs" registry](https://datatracker.ietf.org/doc/html/rfc8414#ref-IANA.well-known).
 *
 * Different applications utilizing OAuth authorization servers in application-specific ways may
 * define and register different well-known URI suffixes used to publish authorization server
 * metadata as used by those applications. For instance, if the example application uses an OAuth
 * authorization server in an example-specific way, and there are example-specific metadata values
 * that it needs to publish, then it might register and use the `example-configuration` URI suffix
 * and publish the metadata document at the path formed by inserting
 * `/.well-known/example-configuration` between the host and path components of the authorization
 * server's issuer identifier. Alternatively, many such applications will use the default
 * well-known URI string `/.well-known/oauth-authorization-server`, which is the right choice for
 * general-purpose OAuth authorization servers, and not register an application-specific one.
 *
 * An OAuth 2.0 application using this specification **MUST** specify what well-known URI suffix
 * it will use for this purpose. The same authorization server **MAY** choose to publish its metadata
 * at multiple well-known locations derived from its issuer identifier, for example, publishing
 * metadata at both `/.well-known/example-configuration` and
 * `/.well-known/oauth-authorization-server`.
 *
 * Some OAuth applications will choose to use the well-known URI suffix `openid-configuration`.
 * As described in [Section 5](https://datatracker.ietf.org/doc/html/rfc8414#section-5), despite
 * the identifier `/.well-known/openid-configuration`, appearing to be OpenID specific, its usage
 * in this specification is actually referring to a general OAuth 2.0 feature that is not specific
 * to OpenID Connect.
 *
 * Authorization Server Metadata Request
 * -------------------------------------
 *
 *
 * Authorization Server Metadata Response
 * --------------------------------------
 * The response is a set of claims about the authorization server's configuration, including all
 * necessary endpoints and public key location information. A successful response **MUST** use the
 * `200` OK HTTP status code and return a JSON object using the `application/json` content type
 * that contains a set of claims as its members that are a subset of the metadata values defined
 * in [Section 2](https://datatracker.ietf.org/doc/html/rfc8414#section-2). Other claims **MAY**
 * also be returned.
 *
 * Claims that return multiple values are represented as JSON arrays. Claims with zero elements
 * **MUST** be omitted from the response.
 *
 * An error response uses the applicable HTTP status code value.
 *
 * The following is a non-normative example response:
 *
 * ```http
 * HTTP/1.1 200 OK
 * Content-Type: application/json
 *
 * {
 *   "issuer": "https://server.example.com",
 *   "authorization_endpoint": "https://server.example.com/authorize",
 *   "token_endpoint": "https://server.example.com/token",
 *   "token_endpoint_auth_methods_supported": [
 *     "client_secret_basic",
 *     "private_key_jwt"
 *   ],
 *   "token_endpoint_auth_signing_alg_values_supported": [
 *     "RS256",
 *     "ES256"
 *   ],
 *   "userinfo_endpoint": "https://server.example.com/userinfo",
 *   "jwks_uri": "https://server.example.com/jwks.json",
 *   "registration_endpoint": "https://server.example.com/register",
 *   "scopes_supported": [
 *     "openid",
 *     "profile",
 *     "email",
 *     "address",
 *     "phone",
 *     "offline_access"
 *   ],
 *   "response_types_supported": [
 *     "code",
 *     "code token"
 *   ],
 *   "service_documentation": "http://server.example.com/service_documentation.html",
 *   "ui_locales_supported": [
 *     "en-US",
 *     "en-GB",
 *     "en-CA",
 *     "fr-FR",
 *     "fr-CA"
 *   ]
 * }
 * ```
 *
 * @see https://datatracker.ietf.org/doc/html/rfc8414#section-3 RFC 8414, Section 3
 */
export async function handleServerMetadataRequest<
  T extends AuthorizationServerOptions,
>(
  _request: Request,
  {
    configuration: {
      authorizationEndpoint: authorization_endpoint,
      authorizationResponseIssParameterSupported:
        authorization_response_iss_parameter_supported,
      codeChallengeMethodsSupported: code_challenge_methods_supported,
      deviceAuthorizationEndpoint: device_authorization_endpoint,
      grantTypesSupported: grant_types_supported,
      introspectionEndpoint: introspection_endpoint,
      introspectionEndpointAuthMethodsSupported:
        introspection_endpoint_auth_methods_supported,
      issuer: issuer,
      jwksUri: jwks_uri,
      opPolicyUri: op_policy_uri,
      opTosUri: op_tos_uri,
      pushedAuthorizationRequestEndpoint: pushed_authorization_request_endpoint,
      registrationEndpoint: registration_endpoint,
      requirePushedAuthorizationRequests: require_pushed_authorization_requests,
      responseModesSupported: response_modes_supported,
      responseTypesSupported: response_types_supported = [],
      revocationEndpoint: revocation_endpoint,
      revocationEndpointAuthMethodsSupported:
        revocation_endpoint_auth_methods_supported,
      serviceDocumentation: service_documentation,
      tokenEndpoint: token_endpoint,
      tokenEndpointAuthMethodsSupported: token_endpoint_auth_methods_supported,
      tokenEndpointAuthSigningAlgValuesSupported:
        token_endpoint_auth_signing_alg_values_supported,
      uiLocalesSupported: ui_locales_supported,
      userinfoEndpoint: userinfo_endpoint,
    },
    options: { serverMetadata, loadScopes },
  }: {
    configuration: Configuration;
    options: T;
  },
) {
  if (!serverMetadata) {
    throw new OAuthError(
      "invalid_request",
      "The authorization server metadata endpoint is not enabled on this server",
    );
  }

  return jsonResponse({
    authorization_endpoint,
    authorization_response_iss_parameter_supported,
    code_challenge_methods_supported,
    device_authorization_endpoint,
    grant_types_supported,
    introspection_endpoint,
    introspection_endpoint_auth_methods_supported,
    issuer,
    jwks_uri,
    op_policy_uri,
    op_tos_uri,
    pushed_authorization_request_endpoint,
    registration_endpoint,
    require_pushed_authorization_requests,
    response_modes_supported,
    response_types_supported,
    revocation_endpoint,
    revocation_endpoint_auth_methods_supported,
    service_documentation,
    token_endpoint,
    token_endpoint_auth_methods_supported,
    token_endpoint_auth_signing_alg_values_supported,
    ui_locales_supported,
    userinfo_endpoint,
    scopes_supported: await loadScopes(),
    ...serverMetadata.extraMetadata,
  } satisfies AuthorizationServerMetadata);
}

type Configuration = ReturnType<
  typeof createAuthorizationServer
>["configuration"];
