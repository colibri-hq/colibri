import {
  getAuthSessionIdFromCookie,
  resolveUserId,
} from '$lib/server/auth';
import {
  createChallenge,
  findUserByIdentifier,
  listAuthenticatorsForUser,
} from '@colibri-hq/sdk';
import {
  generateAuthenticationOptions,
  type GenerateAuthenticationOptionsOpts,
} from '@simplewebauthn/server';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async function handler({
  url,
  cookies,
  locals: { database },
}) {
  const userId = resolveUserId(cookies);
  const sessionId = getAuthSessionIdFromCookie(cookies);

  if (!sessionId) {
    throw error(403, {
      title: 'Not authorized',
      message: 'Session ID cookie is missing or invalid',
    });
  }

  const options: GenerateAuthenticationOptionsOpts = {
    userVerification: 'required',
    rpID: url.hostname,
    timeout: 60_000,
  };

  if (userId) {
    const user = await findUserByIdentifier(database, userId);
    const authenticators = await listAuthenticatorsForUser(database, user);

    options.allowCredentials = authenticators.map(
      ({ identifier: id, transports }) => ({
        transports,
        id,
      }),
    );
  }

  const responseData = await generateAuthenticationOptions(options);
  const timeout = responseData.timeout || options.timeout || 60_000;

  await createChallenge(database, {
    challenge: responseData.challenge,
    expires_at: new Date(+new Date() + timeout).toISOString(),
    session_identifier: sessionId,
  });

  return json(responseData);
};
