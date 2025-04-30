import { env } from "$env/dynamic/private";
import { getAuthSessionIdFromCookie, resolveUserId } from "$lib/server/auth";
import {
  createChallenge,
  findUserByIdentifier,
  listAuthenticatorsForUser,
} from "@colibri-hq/sdk";
import type { GenerateRegistrationOptionsOpts } from "@simplewebauthn/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async function handler({
  url,
  cookies,
  locals: { database },
}) {
  const sessionId = getAuthSessionIdFromCookie(cookies);

  if (!sessionId) {
    throw error(403, "Not authorized");
  }

  const userId = resolveUserId(cookies);

  if (!userId) {
    return error(401, "Not authenticated");
  }

  const user = await findUserByIdentifier(database, userId);
  const authenticators = await listAuthenticatorsForUser(database, user);
  const options = await generateRegistrationOptions({
    rpName: env.FIDO_NAME || "Colibri",
    rpID: url.hostname,

    userID: isoUint8Array.fromUTF8String(user.id),
    userName: user.email,
    userDisplayName: user.name || user.email,

    timeout: 60_000,
    attestationType: "none",

    /**
     * Passing in a user's list of already-registered authenticator IDs here prevents users from
     * registering the same device multiple times. The authenticator will simply throw an error in
     * the browser if it's asked to perform registration when one of these ID's already resides
     * on it.
     */
    excludeCredentials: authenticators.map(
      ({ identifier: id, transports }) => ({
        type: "public-key",
        transports,
        id,
      }),
    ),

    /**
     * The optional authenticatorSelection property allows for specifying more the types of
     * authenticators that users to can use for registration
     */
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },

    /**
     * Support the two most common algorithms: ES256, and RS256
     */
    supportedAlgorithmIDs: [-7, -257],
  } satisfies GenerateRegistrationOptionsOpts);
  const timeout = options.timeout || 60_000;

  /**
   * The server needs to temporarily remember this value for verification, so don't lose it until
   * after you verify an authenticator response.
   */
  await createChallenge(database, {
    challenge: options.challenge,
    expires_at: new Date(+new Date() + timeout),
    session_identifier: sessionId,
  });

  return json(options);
};
