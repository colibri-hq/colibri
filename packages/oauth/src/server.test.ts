import { createAuthorizationServer } from "./server";
import { AuthorizationCodeGrant } from "./grantTypes/authorizationCodeGrant";
import { type Entities } from "./types";

const server = createAuthorizationServer({
  issuer: "https://example.com",
  jwtSecret: "",
  persistence: {
    async loadClient(clientId) {
      return { id: clientId } as unknown as Entities.Client;
    },
    async loadAccessToken(token) {
      return { token } as unknown as Entities.AccessToken;
    },
    async revokeAccessToken(token) {
      return token;
    },
    async revokeRefreshToken(token) {
      return token;
    },
    async loadAuthorizationRequest(requestUri) {},
    async storeAuthorizationRequest(params) {},
    async issueTokens(params) {
      return {
        accessToken: params.clientId,
        refreshToken: params.clientId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        scopes: params.scopes,
      };
    },
  },
});

server.enableGrantType(AuthorizationCodeGrant, {
  async loadAuthorizationCode(code) {
    return { code } as unknown as Entities.AuthorizationCode;
  },
  async storeAuthorizationCode(code) {},
  authorizationCodeTtl: 3000,
});

export {};
