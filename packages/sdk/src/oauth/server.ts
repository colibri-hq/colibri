import type { Database } from "../database.js";
import {
  createAccessToken,
  createAuthorizationCode,
  createDeviceChallenge,
  createRefreshToken,
  listAllScopes,
  loadAccessToken,
  loadAuthorizationCode,
  loadAuthorizationRequest,
  loadClient,
  loadDeviceChallengeByUserCode,
  loadRefreshToken,
  pollDeviceChallenge,
  revokeAccessToken,
  revokeRefreshToken,
  scopeValidationRegex,
  storeAuthorizationRequest,
} from "../resources/authentication/oauth.js";
import { createAuthorizationServer, type Entities } from "@colibri-hq/oauth";
import jwt from "jsonwebtoken";
import { z } from "zod";

export function server(
  database: Database,
  {
    issuer = "https://colibri.dev",
    jwtSecret,
    accessTokenTtl = 3600,
    refreshTokenTtl = 3600,
  }: {
    issuer: string;
    jwtSecret: string;
    accessTokenTtl?: number;
    refreshTokenTtl?: number;
  },
) {
  function createIdToken(
    clientId: string,
    userIdentifier: string,
    scopes: string[],
    expiresIn: number,
  ) {
    return jwt.sign({ scopes }, jwtSecret, {
      subject: userIdentifier,
      expiresIn,
      issuer,
      audience: clientId,
      notBefore: new Date().getTime(),
    });
  }

  return createAuthorizationServer({
    accessTokenTtl,
    refreshTokenTtl,
    issuer,
    baseUri: "/auth/oauth/",
    jwtSecret,
    token: {
      endpoint: "./token",
    },
    authorizationCode: {
      endpoint: "./authorize",
      ttl: 300,
      loadAuthorizationCode(code) {
        return loadAuthorizationCode(database, code);
      },
      storeAuthorizationCode({
        clientId,
        challenge,
        challengeMethod,
        redirectUri,
        scopes,
        ttl,
        userIdentifier,
      }) {
        return createAuthorizationCode(
          database,
          userIdentifier,
          clientId,
          redirectUri,
          scopes,
          challenge,
          ttl,
          challengeMethod,
        );
      },
    },
    clientCredentials: {
      includeRefreshToken: false,
    },
    refreshToken: {
      loadRefreshToken(token) {
        return loadRefreshToken(database, token);
      },
    },
    deviceCode: {
      endpoint: "./device",
      pollDeviceChallenge(clientId, code) {
        return pollDeviceChallenge(database, clientId, code);
      },
      loadDeviceChallenge(code) {
        return loadDeviceChallengeByUserCode(database, code);
      },
      storeDeviceChallenge(clientId, scopes) {
        return createDeviceChallenge(database, clientId, scopes);
      },
    },
    pushedAuthorizationRequests: {
      endpoint: "./par",
      ttl: 60,
      loadAuthorizationRequest(requestUri) {
        return loadAuthorizationRequest(
          database,
          requestUri,
        ) as Promise<Entities.AuthorizationRequest>;
      },
      storeAuthorizationRequest({
        clientId,
        ttl,
        challenge,
        challengeMethod = "S256",
        redirectUri,
        responseType,
        state,
        scopes,
      }) {
        return storeAuthorizationRequest(database, {
          client_id: clientId,
          code_challenge: challenge,
          code_challenge_method: challengeMethod,
          expires_at: new Date(Date.now() + ttl * 1_000),
          redirect_uri: redirectUri,
          response_type: responseType,
          scopes: scopes ?? null,
          state: state ?? null,
        }) as Promise<Entities.AuthorizationRequest>;
      },
    },
    tokenRevocation: {
      endpoint: "./token/revoke",
      revokeAccessToken(clientId, token) {
        return revokeAccessToken(database, clientId, token);
      },
      revokeRefreshToken(clientId, token) {
        return revokeRefreshToken(database, clientId, token);
      },
    },
    tokenIntrospection: {
      endpoint: "./tokeninfo",
    },
    serverMetadata: {},
    userInfo: {
      endpoint: "./userinfo",
    },
    clientRegistration: {
      endpoint: "./register",
    },
    async issueTokens({
      accessToken,
      refreshToken,
      idToken,
      clientId,
      scopes,
      userIdentifier,
    }) {
      return await database.transaction().execute(async (trx) => {
        const [
          {
            scopes: effectiveScopes,
            token: pendingAccessToken,
            expires_at: expiresAt,
          },
          { token: pendingRefreshToken },
        ] = await Promise.all([
          accessToken
            ? createAccessToken(
                trx,
                clientId,
                userIdentifier ?? null,
                accessToken.scopes ?? scopes,
                accessToken.ttl ?? accessTokenTtl,
              )
            : {
                token: undefined,
                scopes: [],
                expires_at: new Date(0),
              },

          refreshToken
            ? createRefreshToken(
                trx,
                clientId,
                userIdentifier ?? null,
                scopes,
                refreshTokenTtl,
              )
            : { token: undefined },
        ]);

        const pendingIdToken =
          userIdentifier && idToken
            ? createIdToken(clientId, userIdentifier, scopes, accessTokenTtl)
            : undefined;

        if (accessToken?.exchange) {
          await revokeAccessToken(trx, clientId, accessToken.exchange);
        }

        if (refreshToken?.exchange) {
          await revokeRefreshToken(trx, clientId, refreshToken.exchange);
        }

        return {
          accessToken: pendingAccessToken!,
          expiresAt,
          idToken: pendingIdToken,
          refreshToken: pendingRefreshToken,
          scopes: effectiveScopes,
        };
      });
    },

    async loadAccessToken(token) {
      return loadAccessToken(database, token);
    },
    async loadClient(clientId) {
      return loadClient(database, clientId);
    },
    async loadScopes() {
      const scopes = await listAllScopes(database);

      return scopes.map(({ id }) => id);
    },
    scopeSchema: z.string().regex(scopeValidationRegex).array(),
  });
}
