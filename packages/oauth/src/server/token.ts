import { jsonResponse, parseRequestBody, timeOffset } from "../utilities";
import { z, ZodError } from "zod";
import { OAuthError } from "../errors";
import type {
  AuthorizationServerOptions,
  Entities,
  OAuthGrantType,
  PersistedTokensInfo,
  TokenPayload
} from "../types";
import { GrantType } from "../grantTypes/grantType";

/**
 * Token Endpoint
 * ==============
 * The token endpoint is used by the client to obtain an access token by presenting its
 * authorization grant or refresh token. The token endpoint is used with every authorization grant
 * except for the implicit grant type (since an access token is issued directly).
 *
 * The means through which the client obtains the location of the token endpoint are beyond the
 * scope of this specification, but the location is typically provided in the service
 * documentation.
 *
 * The endpoint URI **MAY** include an `application/x-www-form-urlencoded` formatted (per
 * [Appendix B](https://datatracker.ietf.org/doc/html/rfc6749#appendix-B)) query component
 * ([RFC 3986 Section 3.4](https://datatracker.ietf.org/doc/html/rfc3986#section-3.4)), which
 * **MUST** be retained when adding additional query parameters. The endpoint URI **MUST NOT**
 * include a fragment component.
 *
 * Since requests to the token endpoint result in the transmission of clear-text credentials (in
 * the HTTP request and response), the authorization server **MUST** require the use of TLS as
 * described in [Section 1.6](https://datatracker.ietf.org/doc/html/rfc6749#section-1.6) when
 * sending requests to the token endpoint.
 *
 * The client **MUST** use the HTTP `POST` method when making access token requests.
 *
 * Parameters sent without a value **MUST** be treated as if they were omitted from the request.
 * The authorization server **MUST** ignore unrecognized request parameters. Request and response
 * parameters **MUST NOT** be included more than once.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-3.2 RFC 6749, Section 3.2
 */
export async function handleTokenRequest<
  C extends Entities.Client,
  T extends AuthorizationServerOptions<C>,
>(
  request: Request,
  {
    grantTypes,
    options: {
      accessTokenTtl = 3_600,
      idTokenTtl = accessTokenTtl,
      refreshTokenTtl = 604_800,
      issueTokens,
      loadClient,
    },
  }: {
    grantTypes: Map<OAuthGrantType, GrantType>;
    options: T;
  },
) {
  const body = await parseRequestBody(request);

  // region Resolve the client
  const params = z
    .object({
      client_id: z.string({
        message: "The client ID is missing or invalid",
      }),
    })
    .safeParse(body);

  if (!params.success) {
    throw new OAuthError("invalid_client", params.error);
  }

  const { client_id: clientId } = params.data;
  let client: C | undefined;

  try {
    client = await loadClient(clientId);
  } catch {
    throw new OAuthError(
      "invalid_client",
      "The client ID is missing or invalid",
    );
  }

  if (!client || !client.active || client.revoked) {
    throw new OAuthError(
      "invalid_client",
      "The client ID is missing or invalid",
    );
  }
  // endregion

  // region Validate the request
  const supportedGrantTyeps = [...grantTypes.keys()] as [
    OAuthGrantType,
    ...OAuthGrantType[],
  ];
  const tokenRequestSchema = z.intersection(
    z.object({
      grant_type: z.enum(supportedGrantTyeps, {
        required_error: "The grant type is missing",
        invalid_type_error: "The grant type is not supported",
      }),
    }),
    z.record(z.string(), z.string()),
  );

  // endregion

  // region Token issuance helpers
  function issueRefreshToken(
    userIdentifier: string | undefined,
    scopes: string[],
  ) {
    return (
      userIdentifier &&
      scopes.includes("offline_access") &&
      grantTypes.has("refresh_token")
    );
  }

  function issueIdToken(userIdentifier: string | undefined, scopes: string[]) {
    return userIdentifier && scopes.includes("openid");
  }

  // endregion

  try {
    const payload = tokenRequestSchema.parse(body);

    // At this point, we can resolve the grant type from the list of supported grant types,
    // because we are sure the payload matches the simple payload schema.
    const grantType = grantTypes.get(payload.grant_type)!;

    // By validating the data again, against the grant-specific schema, we can make sure the
    // payload matches the data required by the grant-specific validation.
    const data = await grantType.schema.parseAsync(payload);

    // Apply any post-schema validation steps, such as checking the database for expiration or
    // token revocations that are pending.
    const params = await grantType.validate(data, client);

    // Finally, let the grant handle the request.
    const { accessToken, idToken, refreshToken, scopes, userIdentifier } =
      await grantType.handle(params, client);

    // Let the persistence layer issue the tokens at once, ideally in a single atomic transaction
    const tokenInfo = await issueTokens({
      clientId: client.id,
      userIdentifier,
      scopes,
      accessToken: { ttl: accessTokenTtl, ...accessToken },
      refreshToken: issueRefreshToken(userIdentifier, scopes)
        ? { ttl: refreshTokenTtl, ...refreshToken }
        : undefined,
      idToken: issueIdToken(userIdentifier, scopes)
        ? { ttl: idTokenTtl, ...idToken }
        : undefined,
    });

    return tokenResponse(tokenInfo);
  } catch (cause) {
    if (cause instanceof ZodError) {
      throw OAuthError.fromValidationIssues(cause.issues);
    }

    if (cause instanceof OAuthError) {
      throw new OAuthError(cause.code, cause.description, cause.uri, { cause });
    }

    const message = cause instanceof Error ? cause.message : String(cause);

    throw new OAuthError("server_error", message);
  }
}

function tokenResponse({
  accessToken,
  idToken,
  refreshToken,
  scopes,
  expiresAt,
}: PersistedTokensInfo) {
  return jsonResponse({
    access_token: accessToken,
    id_token: idToken,
    token_type: "Bearer",
    expires_in: timeOffset(expiresAt),
    refresh_token: refreshToken,
    scope: scopes.join(" ") || undefined,
  } satisfies TokenPayload);
}
