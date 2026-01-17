import { AuthorizationCodeGrant } from "./grantTypes/authorizationCodeGrant.js";
import { createAuthorizationServer } from "./server.js";

const server = createAuthorizationServer({
  issuer: "https://example.com",
  jwtSecret: "",
  authorizationCode: { loadAuthorizationCode: vi.fn(), storeAuthorizationCode: vi.fn() },
  loadClient: vi.fn(),
  loadAccessToken: vi.fn(),
  issueTokens: vi.fn(),
  loadScopes: vi.fn(),
});

server.enableGrantType(AuthorizationCodeGrant, {
  loadAuthorizationCode: vi.fn(),
  storeAuthorizationCode: vi.fn(),
});

export {};
