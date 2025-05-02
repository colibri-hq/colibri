import type { AuthorizationServerOptions, Entities } from "../types.js";

export async function assertAuthorization<
  T extends Entities.AccessToken,
  O extends AuthorizationServerOptions<Entities.Client, T>,
>(request: Request, { loadAccessToken }: Pick<O, "loadAccessToken">) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    throw new Error("The client authentication is invalid", {
      cause: "Missing Authorization header",
    });
  }

  const [scheme, token] = authorization.split(" ", 2);

  if (scheme !== "Bearer") {
    throw new Error("The client authentication is invalid", {
      cause: `Unexpected authorization scheme: Must be 'Bearer'`,
    });
  }

  const accessToken = await loadAccessToken(token);

  if (!accessToken) {
    throw new Error("The client authentication is invalid", {
      cause: "The access token is invalid",
    });
  }

  if (accessToken.revoked_at !== null) {
    throw new Error("The client authentication is invalid", {
      cause: "The access token has been revoked",
    });
  }

  if (accessToken.expires_at <= new Date()) {
    throw new Error("The client authentication is invalid", {
      cause: "The access token has expired",
    });
  }

  return accessToken;
}
