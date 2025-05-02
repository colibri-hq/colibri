import { OAuthError } from "./errors.js";
import type { AuthorizationServerOptions, Entities } from "./types.js";
import {
  GrantType,
  type GrantTypeFactory,
  type GrantTypeOptions,
} from "./grantTypes/grantType.js";
import { handleTokenIntrospection } from "./server/introspection.js";
import { handleServerMetadataRequest } from "./server/metadata.js";
import { handleTokenRevocation } from "./server/revocation.js";
import { handleTokenRequest } from "./server/token.js";
import { assertAuthorization } from "./server/assert.js";
import {
  AuthorizationCodeGrant,
  handleAuthorizationRequest,
  handlePushedAuthorizationRequest,
} from "./grantTypes/authorizationCodeGrant.js";
import {
  DeviceCodeGrant,
  handleDeviceAuthorizationRequest,
} from "./grantTypes/deviceCodeGrant.js";
import { ClientCredentialsGrant } from "./grantTypes/clientCredentialsGrant.js";
import { RefreshTokenGrant } from "./grantTypes/refreshTokenGrant.js";
import { z } from "zod";

export function createAuthorizationServer<
  C extends Entities.Client,
  T extends Entities.AccessToken,
>(options: AuthorizationServerOptions<C, T>): AuthorizationServer<C, T> {
  return new AuthorizationServer(options);
}

/**
 * # OAuth 2.0 Authorization Server
 *
 * The OAuth 2.0 Authorization Server is responsible for handling authorization requests and
 * issuing tokens.
 *
 * It implements the OAuth 2.0 Authorization Framework and provides support for pluggable
 * grant types.
 */
class AuthorizationServer<
  C extends Entities.Client,
  A extends Entities.AccessToken,
> {
  public readonly baseUri: URL;
  /**
   * Missing still: 'urn:ietf:params:oauth:grant-type:token-exchange'
   */
  #grantTypes: Map<GrantType["type"], GrantType<GrantTypeOptions, C>> =
    new Map();
  readonly #options: Required<AuthorizationServerOptions<C, A>>;

  public constructor(options: AuthorizationServerOptions<C, A>) {
    this.baseUri = options.baseUri
      ? new URL(options.baseUri, options.issuer)
      : new URL("oauth/", options.issuer);

    this.#options = {
      accessTokenTtl: 3_600,
      baseUri: this.baseUri,
      clientCredentials: false,
      clientManagement: false,
      clientRegistration: false,
      deviceCode: false,
      documentationUri: "https://colibri.dev/help/oauth",
      idTokenTtl: 3_600,
      jwksUri: "./jwks",
      policyUri: "https://colibri.dev/help/policy",
      pushedAuthorizationRequests: false,
      refreshToken: false,
      refreshTokenTtl: 86_400,
      scopeSchema: z.string().array(),
      serverMetadata: false,
      termsOfServiceUri: "https://colibri.dev/help/terms",
      token: {
        endpoint: "./token",
        authMethodsSupported: ["client_secret_post"],
        authSigningAlgValuesSupported: ["RS256"],
        ...options.token,
      },
      tokenExchange: false,
      tokenIntrospection: false,
      tokenRevocation: false,
      uiLocalesSupported: ["en_GB"],
      userInfo: false,
      ...options,
    };

    if (options.authorizationCode) {
      this.enableGrantType(AuthorizationCodeGrant, {
        ttl: 300,
        ...options.authorizationCode,
      });
    }

    if (options.deviceCode) {
      this.enableGrantType(DeviceCodeGrant, {
        ttl: 900,
        devicePollingInterval: 5,
        ...options.deviceCode,
      });
    }

    if (options.refreshToken) {
      this.enableGrantType(RefreshTokenGrant, options.refreshToken);
    }

    if (options.clientCredentials) {
      this.enableGrantType(ClientCredentialsGrant, options.clientCredentials);
    }
  }

  /**
   * Retrieves the server configuration
   */
  public get configuration() {
    const {
      deviceCode,
      documentationUri,
      jwksUri,
      policyUri,
      pushedAuthorizationRequests,
      token,
      clientRegistration,
      tokenRevocation,
      tokenIntrospection,
      termsOfServiceUri,
      userInfo,
      uiLocalesSupported,
      authorizationCode,
    } = this.#options;

    const authorizationCodeOptions = authorizationCode
      ? {
          authorizationEndpoint: new URL(
            authorizationCode.endpoint ?? "./authorize",
            this.baseUri,
          ),
          authorizationResponseIssParameterSupported: true,
          codeChallengeMethodsSupported:
            authorizationCode.codeChallengeMethodsSupported ?? ["S256"],
          responseModesSupported: authorizationCode.responseModesSupported ?? [
            "query",
          ],
          responseTypesSupported: authorizationCode.responseTypesSupported ?? [
            "code",
          ],
        }
      : undefined;

    const deviceCodeOptions = deviceCode
      ? {
          deviceAuthorizationEndpoint: new URL(
            deviceCode.endpoint ?? "./device",
            this.baseUri,
          ),
        }
      : undefined;

    const pushedAuthorizationRequestsOptions = pushedAuthorizationRequests
      ? {
          pushedAuthorizationRequestEndpoint: new URL(
            pushedAuthorizationRequests.endpoint ?? "./par",
            this.baseUri,
          ),
          requirePushedAuthorizationRequests:
            pushedAuthorizationRequests.required,
        }
      : undefined;

    const tokenIntrospectionOptions = tokenIntrospection
      ? {
          introspectionEndpoint: new URL(
            tokenIntrospection.endpoint ?? "./tokeninfo",
            this.baseUri,
          ),
          introspectionEndpointAuthMethodsSupported:
            tokenIntrospection.authMethodsSupported,
          introspectionEndpointAuthSigningAlgValuesSupported:
            tokenIntrospection.authSigningAlgValuesSupported,
        }
      : undefined;

    const tokenRevocationOptions = tokenRevocation
      ? {
          revocationEndpoint: new URL(
            tokenRevocation.endpoint ?? "./token/revoke",
            this.baseUri,
          ),
          revocationEndpointAuthMethodsSupported:
            tokenRevocation.authMethodsSupported,
          revocationEndpointAuthSigningAlgValuesSupported:
            tokenRevocation.authSigningAlgValuesSupported,
        }
      : undefined;

    const tokenEndpointOptions = {
      tokenEndpoint: new URL(token.endpoint!, this.baseUri),
      tokenEndpointAuthMethodsSupported: token.authMethodsSupported!,
      tokenEndpointAuthSigningAlgValuesSupported:
        token.authSigningAlgValuesSupported!,
    };

    return {
      ...authorizationCodeOptions,
      ...deviceCodeOptions,
      ...pushedAuthorizationRequestsOptions,
      ...tokenIntrospectionOptions,
      ...tokenRevocationOptions,
      ...tokenEndpointOptions,

      grantTypesSupported: Array.from(this.#grantTypes.keys()),

      issuer: this.baseUri,
      jwksUri: jwksUri ? new URL(jwksUri, this.baseUri) : undefined,
      opPolicyUri: policyUri ? new URL(policyUri, this.baseUri) : undefined,
      opTosUri: termsOfServiceUri
        ? new URL(termsOfServiceUri, this.baseUri)
        : undefined,

      registrationEndpoint: clientRegistration
        ? new URL(clientRegistration.endpoint ?? "./register", this.baseUri)
        : undefined,

      serviceDocumentation: new URL(documentationUri, this.baseUri),

      uiLocalesSupported,
      userinfoEndpoint: userInfo
        ? new URL(userInfo.endpoint ?? "./userinfo", this.baseUri)
        : undefined,
    };
  }

  public enableGrantType<
    G extends GrantType,
    F extends GrantTypeFactory<G>,
    O extends GrantTypeOptions = F extends GrantTypeFactory<G, infer O>
      ? O
      : never,
  >(
    GrantTypeFactory: GrantTypeFactory<G, O>,
    options: Omit<O, keyof GrantTypeOptions>,
  ) {
    const grantType = new GrantTypeFactory({
      accessTokenTtl: this.#options.accessTokenTtl,
      refreshTokenTtl: this.#options.refreshTokenTtl,
      ...options,
    } as O); // TODO: Can we get rid of this cast?

    this.#grantTypes.set(grantType.type, grantType);
  }

  // region OAuth 2.0 endpoints
  public async handleTokenRequest(request: Request): Promise<Response> {
    return handleTokenRequest(request, {
      grantTypes: this.#grantTypes,
      options: this.#options,
    });
  }

  public async handleTokenRevocationRequest(
    request: Request,
  ): Promise<Response> {
    return handleTokenRevocation(request, this.#options);
  }

  public async handleTokenIntrospectionRequest(
    request: Request,
  ): Promise<Response> {
    return handleTokenIntrospection(request, this.#options);
  }

  public async handleServerMetadataRequest(
    request: Request,
  ): Promise<Response> {
    return handleServerMetadataRequest(request, {
      configuration: this.configuration,
      options: this.#options,
    });
  }

  public async handleAuthorizationRequest(
    request: Request,
    userIdentifier: string,
  ): Promise<Response> {
    if (!this.#options.authorizationCode) {
      throw new OAuthError(
        "unauthorized_client",
        "The authorization_code grant type is not enabled on this server",
      );
    }

    return handleAuthorizationRequest(request, {
      grantOptions: this.#options.authorizationCode,
      options: this.#options,
      userIdentifier,
    });
  }

  public async handleDeviceAuthorizationRequest(
    request: Request,
  ): Promise<Response> {
    if (!this.#options.deviceCode) {
      throw new OAuthError(
        "unauthorized_client",
        "The device_code grant type is not enabled on this server",
      );
    }

    return handleDeviceAuthorizationRequest(request, {
      grantOptions: this.#options.deviceCode,
      options: this.#options,
    });
  }

  public async handlePushedAuthorizationRequest(
    request: Request,
  ): Promise<Response> {
    if (!this.#options.authorizationCode) {
      throw new OAuthError(
        "unauthorized_client",
        "The authorization_code grant type is not enabled on this server",
      );
    }

    return handlePushedAuthorizationRequest(request, this.#options);
  }

  // endregion

  public checkAuthorization(request: Request): Promise<A> {
    return assertAuthorization(request, this.#options);
  }
}
