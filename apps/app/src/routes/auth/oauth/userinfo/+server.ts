import { env } from "$env/dynamic/private";
import { oauth, oauthError } from "$lib/server/oauth";
import { type Database, findUserByIdentifier } from "@colibri-hq/sdk";
import { resolveAcceptedMediaTypes } from "@colibri-hq/shared";
import { error, json } from "@sveltejs/kit";
import jwt from "jsonwebtoken";
import type { RequestHandler } from "./$types";

export const GET = async function handler({ request, url, locals: { database } }) {
  return handleUserInfo(request, url, database);
} satisfies RequestHandler;

export const POST = async function handler({ request, url, locals: { database } }) {
  return handleUserInfo(request, url, database);
} satisfies RequestHandler;

export const prerender = false;

async function handleUserInfo(request: Request, url: URL, database: Database) {
  let authorizedUserId: string | null;
  let authorizedClientId: string;

  try {
    ({ user_id: authorizedUserId, client_id: authorizedClientId } =
      await oauth(database).checkAuthorization(request));
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    const { message, cause } = error;

    return oauthError("invalid_client", message + (cause ? `: ${cause}` : ""));
  }

  if (!authorizedUserId) {
    return oauthError("access_denied", "The user is not authenticated");
  }

  const {
    birthdate,
    email,
    name,
    role,
    id: sub,
    updated_at,
    verified: email_verified,
  } = await findUserByIdentifier(database, authorizedUserId);

  for (const mediaType of resolveAcceptedMediaTypes(request)) {
    if (mediaType.startsWith("application/json") || mediaType === "*/*") {
      return json({
        sub,
        name,
        email,
        email_verified,
        preferred_username: email,
        birthdate: birthdate?.toDateString(),
        updated_at: Math.floor((updated_at ?? new Date()).getTime() / 1_000),
        [new URL("role", url).toString()]: role,
      });
    }

    if (mediaType === "application/jwt") {
      const jsonWebToken = jwt.sign(
        {
          name,
          email,
          email_verified,
          preferred_username: email,
          birthdate: birthdate?.toDateString(),
          updated_at: Math.floor((updated_at ?? new Date()).getTime() / 1_000),
          [new URL("role", url).toString()]: role,
        },
        env.JWT_SECRET,
        { subject: sub, issuer: url.origin, audience: authorizedClientId },
      );

      return new Response(jsonWebToken);
    }
  }

  throw error(406, "Unsupported media type requested");
}
