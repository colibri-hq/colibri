import { getAuthSessionIdFromCookie, resolveUserId } from "$lib/server/auth";
import {
  createAuthenticator,
  deleteChallenges,
  findUserByIdentifier,
  listAuthenticatorsForUser,
  resolveCurrentChallenge,
} from "@colibri-hq/sdk";
import { encodeToBase64 } from "@colibri-hq/shared";
import {
  type RegistrationResponseJSON,
  type VerifiedRegistrationResponse,
  verifyRegistrationResponse,
  type VerifyRegistrationResponseOpts,
} from "@simplewebauthn/server";
import { error, json, type RequestHandler } from "@sveltejs/kit";
import { UAParser } from "ua-parser-js";

export const POST = async function handler({
  url,
  request,
  cookies,
  locals: { database },
}) {
  const sessionId = getAuthSessionIdFromCookie(cookies);

  if (!sessionId) {
    throw error(403, {
      title: "Not authorized",
      message: "Session ID cookie is missing or invalid",
    });
  }

  const userId = resolveUserId(cookies);

  if (!userId) {
    throw error(401, "Not authenticated");
  }

  const user = await findUserByIdentifier(database, userId);

  if (!user) {
    throw error(401, "Not authenticated");
  }

  let expectedChallenge: string;

  try {
    expectedChallenge = await resolveCurrentChallenge(database, sessionId);
  } catch (err) {
    if (!(err instanceof Error)) {
      throw err;
    }

    await deleteChallenges(database, sessionId);

    throw error(400, `Failed to resolve challenge: ${err.message}`);
  }

  let response: RegistrationResponseJSON;

  // TODO: Validation

  try {
    response = (await request.json()) as RegistrationResponseJSON;
  } catch (err) {
    if (!(err instanceof Error)) {
      throw err;
    }

    throw error(400, `Invalid request body: ${err.message}`);
  }

  let verification: VerifiedRegistrationResponse;

  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,

      // TODO: Replace with env vars
      expectedOrigin: url.origin, // <-- TODO: Use origin from RP ID instead
      expectedRPID: url.hostname, // <-- TODO: Use hostname from env instead
    } satisfies VerifyRegistrationResponseOpts);
  } catch (err) {
    if (!(err instanceof Error)) {
      throw err;
    }

    await deleteChallenges(database, sessionId);

    throw error(400, `Failed to verify registration response: ${err.message}`);
  }

  const { verified, registrationInfo } = verification;

  if (verified && registrationInfo) {
    const {
      credential: { publicKey: credentialPublicKey, id: credentialID, counter },
      credentialBackedUp,
      credentialDeviceType,
      credentialType,
    } = registrationInfo;

    const authenticators = await listAuthenticatorsForUser(database, user);
    const existingDevice = authenticators.find(
      ({ identifier }) => identifier === credentialID,
    );

    if (!existingDevice) {
      await createAuthenticator(database, {
        agent: inferAgent(request) ?? "",
        backed_up: credentialBackedUp || false,
        counter: counter.toString(),
        device_type: credentialDeviceType,
        handle: inferHandle(request),
        identifier: encodeToBase64(credentialID, true, true),
        public_key: encodeToBase64(credentialPublicKey, true, true),
        transports: response.response.transports ?? [],
        type: credentialType,
        user_id: user.id,
      });
    }
  }

  await deleteChallenges(database, sessionId);

  return json({ verified } satisfies VerificationResponse);
} satisfies RequestHandler;

function inferHandle(request: Request) {
  const userAgent = request.headers.get("user-agent") || "";
  const { os, browser } = UAParser(userAgent);

  return `${browser.name} on ${os.name} ${os.version}`;
}

function inferAgent(request: Request) {
  const userAgent = request.headers.get("user-agent") || "";
  const { browser } = UAParser(userAgent);

  return browser.name;
}

export type VerificationResponse = {
  verified: boolean;
};
