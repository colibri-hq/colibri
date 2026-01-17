import type { Entities, OAuthErrorCode } from "@colibri-hq/oauth";
import type { Database } from "@colibri-hq/sdk";
import type { APIRequestContext } from "playwright";
import { storeAuthorizationCode } from "@colibri-hq/sdk";
import { type APIResponse, expect, type Page } from "@playwright/test";
import { type Server } from "node:http";
import { test } from "../base";
import {
  createHttpResponder,
  generateCodeVerifierAndChallenge,
  override,
  type OverrideOption,
} from "./utilities";

// region Redirect URI HTTP Responder Setup
let server: Server;

test.beforeAll(async () => {
  server = await createHttpResponder(3_000, {
    "/oauth/callback": () => new Response("Authorized", { status: 200 }),
  });
});

test.afterAll(() => server.close());
// endregion

test.describe("OAuth Endpoints", () => {
  test.describe("Authorization Endpoint", () => {
    test("Generate Authorization Code [RFC 6749]", async ({ page }) => {
      await testAuthorizationSuccess(page);
    });

    test("Reject missing response type [RFC 6749]", async ({ page }) => {
      await testAuthorizationFailure(page, "invalid_request", { response_type: undefined });
    });

    test("Reject invalid response type [RFC 6749]", async ({ page }) => {
      await testAuthorizationFailure(page, "unsupported_response_type", {
        response_type: "broken",
      });
    });

    test("Reject invalid code challenge method [RFC 6749]", async ({ page }) => {
      await testAuthorizationFailure(page, "invalid_request", { code_challenge_method: "S257" });
    });

    test("Accept bogus code challenge [RFC 6749]", async ({ page }) => {
      await testAuthorizationSuccess(page, { code_challenge: "broken" });
    });

    test("Reject missing client ID [RFC 6749]", async ({ page }) => {
      await testAuthorization(
        page,
        async (_url, page) => {
          const text = await page.locator('[data-testid="oauthErrorType"]').textContent();

          expect(text).toContain("invalid_request");
        },
        { client_id: undefined },
      );
    });

    test("Reject broken redirect URI [RFC 6749]", async ({ page }) => {
      await testAuthorization(
        page,
        async (_url, page) => {
          const text = await page.locator('[data-testid="oauthErrorType"]').textContent();

          expect(text).toContain("invalid_request");
        },
        { redirect_uri: "broken" },
      );
    });

    test("Reject missing redirect URI [RFC 6749]", async ({ page }) => {
      await testAuthorization(
        page,
        async (_url, page) => {
          const text = await page.locator('[data-testid="oauthErrorType"]').textContent();

          expect(text).toContain("invalid_request");
        },
        { redirect_uri: undefined },
      );
    });

    test("Reject correct, but invalid redirect URI [RFC 6749]", async ({ page }) => {
      await testAuthorization(
        page,
        async (_url, page) => {
          const text = await page.locator('[data-testid="oauthErrorType"]').textContent();

          expect(text).toContain("invalid_request");
        },
        { redirect_uri: "http://foo.bar" },
      );
    });

    test("Reject invalid scope [RFC 6749]", async ({ page }) => {
      await testAuthorizationFailure(page, "invalid_scope", {
        scope: "invalid1 invalid2 invalid3",
      });
    });

    // https://datatracker.ietf.org/doc/html/rfc9126#section-4-1
    // "The authorization server MUST support the request_uri parameter."
    test("Accept request_uri instead of authorization parameters [RFC 9126]", async ({
      page,
      database,
    }) => {
      const { identifier } = await database
        .insertInto("authentication.authorization_request")
        .values({
          client_id: "test-client",
          code_challenge: "challenge",
          code_challenge_method: "S256",
          expires_at: new Date(new Date().getTime() + 3_600),
          redirect_uri: "http://localhost:3000/oauth/callback",
          response_type: "code",
          scopes: ["profile"],
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      await testAuthorizationSuccess(page, {
        request_uri: `urn:ietf:params:oauth:request_uri:${identifier}`,
        client_id: "test-client",
      });
    });

    // https://datatracker.ietf.org/doc/html/rfc9126#section-4-4
    // "The authorization server MUST validate authorization requests arising from a pushed request
    // as it would any other authorization request."
    test("Reject unknown request URI [RFC 9126]", async ({ page }) => {
      await testAuthorizationFailure(
        page,
        "invalid_request",
        {
          request_uri: `urn:ietf:params:oauth:request_uri:${crypto.randomUUID()}`,
          client_id: "test-client",
        },
        { expectRedirect: false },
      );
    });

    // https://datatracker.ietf.org/doc/html/rfc9126#section-4-3
    // "An expired request_uri MUST be rejected as invalid."
    test("Reject expired request URI [RFC 9126]", async ({ page, database }) => {
      const { identifier } = await database
        .insertInto("authentication.authorization_request")
        .values({
          client_id: "test-client",
          code_challenge: "challenge",
          code_challenge_method: "S256",
          expires_at: new Date(new Date().getTime() - 3_600),
          redirect_uri: "http://localhost:3000/oauth/callback",
          response_type: "code",
          scopes: ["profile"],
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      await testAuthorizationFailure(
        page,
        "invalid_request",
        {
          request_uri: `urn:ietf:params:oauth:request_uri:${identifier}`,
          client_id: "test-client",
        },
        { expectRedirect: false },
      );
    });

    // https://datatracker.ietf.org/doc/html/rfc9126#section-4-3
    // "Since parts of the authorization request content, e.g., the code_challenge parameter value,
    // are unique to a particular authorization request, the client MUST only use a request_uri
    // value once. Authorization servers SHOULD treat request_uri values as one-time use but MAY
    // allow for duplicate requests due to a user reloading/refreshing their user agent."
    test("Reject reused request URI [RFC 9126]", async ({ page, database }) => {
      const { identifier } = await database
        .insertInto("authentication.authorization_request")
        .values({
          client_id: "test-client",
          code_challenge: "challenge",
          code_challenge_method: "S256",
          expires_at: new Date(new Date().getTime() + 3_600),
          redirect_uri: "http://localhost:3000/oauth/callback",
          response_type: "code",
          scopes: ["profile"],
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      await testAuthorizationSuccess(page, {
        request_uri: `urn:ietf:params:oauth:request_uri:${identifier}`,
        client_id: "test-client",
      });

      await testAuthorizationFailure(
        page,
        "invalid_request",
        {
          request_uri: `urn:ietf:params:oauth:request_uri:${identifier}`,
          client_id: "test-client",
        },
        { expectRedirect: false },
      );
    });
  });

  test.describe("Token Endpoint", () => {
    test.describe("Grant Type: authorization_code [RFC 6749]", () => {
      test("Exchange Authorization Code for Access Token", async ({ request, database }) => {
        await testAuthorizationCodeExchangeSuccess(request, database);
      });

      // https://datatracker.ietf.org/doc/html/rfc6749.html#section-5.2
      test("Reject invalid grant_type", async ({ request, database }) => {
        await testAuthorizationCodeExchangeFailure(
          request,
          database,
          "invalid_request",
          undefined,
          () => ({ form: { grant_type: "broken" } }),
        );
      });

      // https://datatracker.ietf.org/doc/html/rfc6749.html#section-5.2
      test("Reject previously used authorization code", async ({ request, database }) => {
        await testAuthorizationCodeExchangeFailure(request, database, "invalid_grant", {
          used_at: new Date(),
          challenge: "previously-used",
        });
      });

      // https://datatracker.ietf.org/doc/html/rfc6749.html#section-5.2
      test("Reject expired authorization code", async ({ request, database }) => {
        await testAuthorizationCodeExchangeFailure(request, database, "invalid_grant", {
          expires_at: new Date(new Date().getTime() - 100),
        });
      });

      // https://datatracker.ietf.org/doc/html/rfc6749.html#section-5.2
      test("Reject revoked authorization code", async ({ request, database }) => {
        await testAuthorizationCodeExchangeFailure(request, database, "invalid_grant", {
          revoked: true,
        });
      });

      // https://datatracker.ietf.org/doc/html/rfc6749.html#section-5.2
      test("Reject invalid challenge", async ({ request, database }) => {
        await testAuthorizationCodeExchangeFailure(request, database, "invalid_grant", {
          challenge: "invalid",
        });
      });

      // https://datatracker.ietf.org/doc/html/rfc6749.html#section-5.2
      test("Reject invalid client ID", async ({ request, database }) => {
        await testAuthorizationCodeExchangeFailure(request, database, "invalid_client", undefined, {
          form: { client_id: "invalid" },
        });
      });

      // https://datatracker.ietf.org/doc/html/rfc6749.html#section-5.2
      test("Reject confidential client", async ({ request, database }) => {
        await testAuthorizationCodeExchangeFailure(
          request,
          database,
          "invalid_client",
          { client_id: "test-client-confidential" },
          { form: { client_id: "test-client-confidential" } },
        );
      });

      test('Includes refresh token if "offline_access" scope is used', async ({
        request,
        database,
      }) => {
        await testAuthorizationCodeExchange(
          request,
          database,
          (response, responseBody) => {
            expectTokenSuccessResponse(response, responseBody);

            expect(
              responseBody,
              'Response must contain a refresh token if the "offline_access" is used',
            ).toHaveProperty("refresh_token");
          },
          undefined,
          { form: { scope: "profile offline_access" } },
        );
      });

      test("Includes no refresh token if offline_access scope is not used", async ({
        request,
        database,
      }) => {
        await testAuthorizationCodeExchange(
          request,
          database,
          (response, responseBody) => {
            expectTokenSuccessResponse(response, responseBody);

            expect(
              responseBody,
              "Response must not contain a refresh token if " +
                'the "offline_access" scope is not used',
            ).not.toHaveProperty("refresh_token");
          },
          undefined,
          { form: { scope: "profile" } },
        );
      });

      test('Includes ID token if "openid" scope is used', async ({ request, database }) => {
        await testAuthorizationCodeExchange(
          request,
          database,
          (response, responseBody) => {
            expectTokenSuccessResponse(response, responseBody);

            expect(
              responseBody,
              'Response must contain an ID token if the "openid" scope is used',
            ).toHaveProperty("id_token");
          },
          undefined,
          { form: { scope: "profile openid" } },
        );
      });

      test('Includes no ID token if "openid" scope is not used', async ({ request, database }) => {
        await testAuthorizationCodeExchange(
          request,
          database,
          (response, responseBody) => {
            expectTokenSuccessResponse(response, responseBody);

            expect(
              responseBody,
              'Response must not contain an ID token if the "openid" scope is not used',
            ).not.toHaveProperty("id_token");
          },
          undefined,
          { form: { scope: "profile" } },
        );
      });
    });

    test.describe("Grant Type: client_credentials [RFC 6749]", () => {
      test("Obtain an Access Token using Client Credentials", async ({ request }) => {
        await testClientCredentialsSuccess(request);
      });

      test("Reject invalid client secret", async ({ request }) => {
        await testClientCredentialsError(request, "invalid_request", {
          form: { client_secret: "invalid" },
        });
      });

      test("Reject missing client secret", async ({ request }) => {
        await testClientCredentialsError(request, "invalid_request", {
          form: {
            // @ts-expect-error -- The key will be removed automatically
            client_secret: undefined,
          },
        });
      });

      test("Reject invalid client ID", async ({ request }) => {
        await testClientCredentialsError(request, "invalid_client", {
          form: { client_id: "invalid" },
        });
      });

      test("Reject missing client ID", async ({ request }) => {
        await testClientCredentialsError(request, "invalid_client", {
          form: {
            // @ts-expect-error -- The key will be removed automatically
            client_id: undefined,
          },
        });
      });

      test("Reject public (non-confidential) client ID", async ({ request }) => {
        await testClientCredentialsError(request, "invalid_client", {
          form: { client_id: "test-client" },
        });
      });

      test("Reject invalid scope", async ({ request }) => {
        await testClientCredentialsError(request, "invalid_scope", { form: { scope: "invalid" } });
      });

      for (const scope of ["profile", "email", "offline_access", "openid"]) {
        test(`Reject user-specific scope "${scope}"`, async ({ request }) => {
          await testClientCredentialsError(request, "invalid_scope", { form: { scope } });
        });
      }
    });

    test.describe("Grant Type: refresh_token [RFC 6749]", () => {
      test("Refresh an Access Token using a Refresh Token", async ({ request }) => {
        const initialResponse = await request.post("/auth/oauth/token", {
          headers: { accept: "application/json" },
          form: {
            grant_type: "client_credentials",
            client_id: "test-client-confidential",
            client_secret: "foo",
          },
        });

        const initialResponseBody = await initialResponse.json();
        expect(initialResponseBody).toHaveProperty("refresh_token");

        const response = await request.post("/auth/oauth/token", {
          headers: { accept: "application/json" },
          form: {
            grant_type: "refresh_token",
            refresh_token: initialResponseBody.refresh_token,
            client_id: "test-client-confidential",
          },
        });
        expect(response.status()).toBe(200);

        const responseBody = await response.json();
        expect(responseBody).toHaveProperty("access_token");
        expect(responseBody).toHaveProperty("refresh_token");
        expect(responseBody).toHaveProperty("expires_in");
        expect(responseBody).toHaveProperty("token_type", "Bearer");
      });
    });
  });

  test.describe("Pushed Authorization Request Endpoint [RFC 9126]", () => {
    test("Accept Pushed Authorization Request", async ({ request, database }) => {
      const response = await request.post("/auth/oauth/par", {
        form: {
          client_id: "test-client",
          code_challenge: "challenge",
          code_challenge_method: "S256",
          redirect_uri: "http://localhost:3000/oauth/callback",
          response_type: "code",
          scope: "profile",
        },
      });

      expect(
        response.status(),
        "If the verification is successful, the server MUST generate a request URI and provide " +
          "it in the response with a 201 HTTP status code.",
      ).toBe(201);
      expect(
        response.headers(),
        'The authorization server MUST include the HTTP "Cache-Control" response header field ' +
          '[RFC2616] with a value of "no-store" in any response containing tokens, credentials, ' +
          'or other sensitive information, as well as the "Pragma" response header field ' +
          '[RFC2616] with a value of "no-cache".',
      ).toHaveProperty("cache-control", "no-cache, no-store");
      const body = await response.json();
      expect(
        body,
        "If the verification is successful, the server MUST generate a request URI and provide " +
          "it in the response with a 201 HTTP status code.",
      ).toHaveProperty("request_uri");
      expect(
        body,
        "A JSON number that represents the lifetime of the request URI in seconds as a " +
          "positive integer.",
      ).toHaveProperty("expires_in");
      expect(body.expires_in).toBeGreaterThan(0);

      const identifier = body.request_uri.split(":").pop();

      await database
        .deleteFrom("authentication.authorization_request")
        .where("identifier", "=", identifier)
        .execute();
    });

    test("Reject Pushed Authorization Request using the request_uri parameter", async ({
      request,
    }) => {
      const response = await request.post("/auth/oauth/par", {
        form: {
          client_id: "test-client",
          code_challenge: "challenge",
          code_challenge_method: "S256",
          redirect_uri: "http://localhost:3000/oauth/callback",
          response_type: "code",
          scope: "profile",

          request_uri: "urn:ietf:params:oauth:request_uri:123456",
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty("error", "invalid_request");
      expect(body).toHaveProperty("error_description");
    });
  });
});

// region Authorization Code Tests
async function testAuthorization(
  page: Page,
  assertion: (url: URL, page: Page) => unknown,
  overrideParams?: Record<string, string | undefined>,
) {
  const redirectUri = "http://localhost:3000/oauth/callback";
  const [, challenge] = generateCodeVerifierAndChallenge();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: "test-client",
    redirect_uri: redirectUri,
    scope: "profile",
    code_challenge_method: "S256",
    code_challenge: challenge,
    ...overrideParams,
  });

  if (overrideParams) {
    Object.entries(overrideParams ?? {})
      .filter(([, value]) => typeof value === "undefined")
      .forEach(([key]) => params.delete(key));
  }

  const authUrl = `/auth/oauth/authorize?${params.toString()}`;
  await page.goto(authUrl);

  return assertion(new URL(page.url()), page);
}

function testAuthorizationFailure(
  page: Page,
  expectedError: OAuthErrorCode,
  overrideParams?: Record<string, string | undefined>,
  options?: { expectRedirect: boolean },
) {
  options = { expectRedirect: true, ...options };

  return testAuthorization(
    page,
    async (url) => {
      await page.waitForURL(url.toString());
      const { searchParams } = url;

      if (url.pathname === "/auth/oauth/authorize") {
        const text = await page.locator('[data-testid="oauthErrorType"]').textContent();
        const description = await page
          .locator('[data-testid="oauthErrorDescription"]')
          .textContent();

        if (!options.expectRedirect) {
          expect(text).toContain(expectedError);
        } else {
          throw new Error(
            `Received user-facing error "${text}" ("${description}") when redirection to ` +
              "redirect URI was expected. If this error scenario is expected to return a user-" +
              'facing error for security reasons, pass the "expectRedirect: true" option.',
          );
        }

        return;
      }

      expect
        .soft(
          searchParams.has("code"),
          "Authorization failure response URL must not include an authorization code",
        )
        .toBeFalsy();
      expect
        .soft(searchParams.get("error"), `Error code must be "${expectedError}"`)
        .toEqual(expectedError);
    },
    overrideParams,
  );
}

function testAuthorizationSuccess(page: Page, overrideParams?: Record<string, string>) {
  return testAuthorization(
    page,
    (url) => {
      expect(
        url.toString().split("?", 2).shift(),
        "Authorization response URL must match the redirect URI",
      ).toBe("http://localhost:3000/oauth/callback");

      expect
        .soft(url.searchParams.get("error"), "Authorization response URL must not include an error")
        .toBeFalsy();
      expect
        .soft(
          url.searchParams.has("code"),
          "Authorization response URL must include an authorization code",
        )
        .toBeTruthy();
      expect
        .soft(url.searchParams.get("code")?.length ?? 0, "Authorization code must not be empty")
        .toBeGreaterThan(0);
    },
    overrideParams,
  );
}

// endregion

// region Authorization Code Token Exchange Tests
async function testAuthorizationCodeExchange(
  request: APIRequestContext,
  database: Database,
  assertion: (response: APIResponse, body: Record<string, unknown>) => unknown,
  authCodeOverrides?: OverrideOption<AuthCodeOptions, AuthorizationCodeExchangeConfigContext>,
  requestOverrides?: OverrideOption<
    ApiRequestOptions<"post">,
    AuthorizationCodeExchangeConfigContext & { authCode: Entities.AuthorizationCode }
  >,
) {
  const [codeVerifier, codeChallenge] = generateCodeVerifierAndChallenge();
  const code = crypto.randomUUID();
  const authCodeProps = override(
    {
      used_at: null,
      expires_at: new Date(new Date().getTime() + 3_600),
      code,
      scopes: ["profile"],
      redirect_uri: "http://localhost:3000/oauth/callback",
      client_id: "test-client",
      user_id: "999",
      challenge: codeChallenge,
      revoked: false,
    } satisfies AuthCodeOptions,
    authCodeOverrides,
    { codeVerifier, codeChallenge, code },
  );

  const authCode = await database
    .insertInto("authentication.authorization_code")
    .values(authCodeProps)
    .returningAll()
    .executeTakeFirstOrThrow();

  const requestOptions = override(
    {
      headers: { accept: "application/json" },
      form: {
        grant_type: "authorization_code",
        code: authCode.code,
        redirect_uri: authCode.redirect_uri,
        client_id: authCode.client_id,
        code_verifier: Buffer.from(codeVerifier, "base64url").toString(),
      },
    } satisfies ApiRequestOptions<"post">,
    requestOverrides,
    { authCode: authCode as Entities.AuthorizationCode, codeVerifier, codeChallenge, code },
  );
  const response = await request.post("/auth/oauth/token", requestOptions);
  const responseBody = await response.json();

  return assertion(response, responseBody);
}

function testAuthorizationCodeExchangeSuccess(
  request: APIRequestContext,
  database: Database,
  authCodeOverrides?: OverrideOption<AuthCodeOptions, AuthorizationCodeExchangeConfigContext>,
  requestOverrides?: OverrideOption<
    ApiRequestOptions<"post">,
    AuthorizationCodeExchangeConfigContext & { authCode: Entities.AuthorizationCode }
  >,
) {
  return testAuthorizationCodeExchange(
    request,
    database,
    (response, responseBody) => expectTokenSuccessResponse(response, responseBody),
    authCodeOverrides,
    requestOverrides,
  );
}

function testAuthorizationCodeExchangeFailure(
  request: APIRequestContext,
  database: Database,
  error: OAuthErrorCode,
  authCodeOverrides?: OverrideOption<AuthCodeOptions, AuthorizationCodeExchangeConfigContext>,
  requestOverrides?: OverrideOption<
    ApiRequestOptions<"post">,
    AuthorizationCodeExchangeConfigContext & { authCode: Entities.AuthorizationCode }
  >,
) {
  return testAuthorizationCodeExchange(
    request,
    database,
    (response, responseBody) => expectTokenErrorResponse(response, responseBody, error),
    authCodeOverrides,
    requestOverrides,
  );
}

// endregion

// region Client Credentials Tests
async function testClientCredentials(
  request: APIRequestContext,
  assertion: (response: APIResponse, body: Record<string, unknown>) => unknown,
  requestOverrides?: OverrideOption<ApiRequestOptions<"post">>,
) {
  const requestOptions = override(
    {
      headers: { accept: "application/json" },
      form: {
        grant_type: "client_credentials",
        client_id: "test-client-confidential",
        client_secret: "foo",
      },
    } satisfies ApiRequestOptions<"post">,
    requestOverrides,
    {},
  );
  const response = await request.post("/auth/oauth/token", requestOptions);

  return assertion(response, await response.json());
}

async function testClientCredentialsSuccess(
  request: APIRequestContext,
  requestOverrides?: OverrideOption<ApiRequestOptions<"post">>,
) {
  return testClientCredentials(
    request,
    (response, responseBody) => expectTokenSuccessResponse(response, responseBody),
    requestOverrides,
  );
}

async function testClientCredentialsError(
  request: APIRequestContext,
  error: OAuthErrorCode,
  requestOverrides?: OverrideOption<ApiRequestOptions<"post">>,
) {
  return testClientCredentials(
    request,
    (response, responseBody) => expectTokenErrorResponse(response, responseBody, error),
    requestOverrides,
  );
}

// endregion

// region Token Response Validation Helpers
function expectTokenSuccessResponse(response: APIResponse, responseBody: Record<string, unknown>) {
  expect
    .soft(response.headers(), `Content-Type must be set to "application/json"`)
    .toHaveProperty("content-type", "application/json");
  expect
    .soft(responseBody, "Successful response body must not contain an error code")
    .not.toHaveProperty("error");
  expect
    .soft(responseBody, "Successful response body must not contain an error description")
    .not.toHaveProperty("error_description");
  expect
    .soft(responseBody, "Successful response body must not contain an error URI")
    .not.toHaveProperty("error_uri");
  expect(response.status(), 'Successful response must have status code "200: OK"').toBe(200);
  expect
    .soft(responseBody, 'Successful response must have token_type set to "Bearer"')
    .toHaveProperty("token_type", "Bearer");
  expect
    .soft(responseBody, "Successful response must contain an access token")
    .toHaveProperty("access_token");
  expect(responseBody, "Successful response must contain an expiration time").toHaveProperty(
    "expires_in",
  );
  expect
    .soft(
      responseBody.expires_in,
      "Successful response must have a positive expiration duration in seconds",
    )
    .toBeGreaterThan(0);
}

function expectTokenErrorResponse(
  response: APIResponse,
  responseBody: Record<string, unknown>,
  error?: OAuthErrorCode,
) {
  expect
    .soft(response.headers(), `Content-Type must be set to "application/json"`)
    .toHaveProperty("content-type", "application/json");
  expect
    .soft(responseBody, "Error response body must contain an error code")
    .toHaveProperty("error", error);
  expect
    .soft(responseBody, "Error response body must contain an error description")
    .toHaveProperty("error_description");
  expect(
    response.status(),
    `Error response must have status code 400 or greater`,
  ).toBeGreaterThanOrEqual(400);
  expect
    .soft(responseBody, "Error response body must not contain an access token")
    .not.toHaveProperty("access_token");
  expect
    .soft(responseBody, "Error response body must not contain a refresh token")
    .not.toHaveProperty("refresh_token");
  expect
    .soft(responseBody, "Error response body must not contain an expiration duration")
    .not.toHaveProperty("expires_in");
  expect
    .soft(responseBody, "Error response body must not contain a token type")
    .not.toHaveProperty("token_type");
}

// endregion

// region Helper Types
type AuthCodeOptions = Partial<Parameters<typeof storeAuthorizationCode>[1]>;
type ApiRequestMethod = "get" | "head" | "post" | "put" | "patch" | "delete";
type ApiRequestOptions<M extends ApiRequestMethod> = Exclude<
  Parameters<APIRequestContext[M]>[1],
  undefined
>;
type AuthorizationCodeExchangeConfigContext = {
  code: string;
  codeVerifier: string;
  codeChallenge: string;
};
// endregion
