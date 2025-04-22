import { oauth } from '$lib/server/oauth';
import { OAuthError } from '@colibri-hq/oauth';
import type { RequestHandler } from './$types';

export const POST = async function handle({ request, locals: { database } }) {
  try {
    return oauth(database).handleDeviceAuthorizationRequest(request);
  } catch (cause) {
    if (cause instanceof OAuthError) {
      const { response } = cause;

      return response;
    }

    throw new Error('Failed to handle device authorization request', { cause });
  }

  // let body: FormData;
  //
  // try {
  //   body = await request.formData();
  // } catch {
  //   return oauthError(
  //     'invalid_request',
  //     'The request content type must be application/x-www-form-urlencoded',
  //   );
  // }
  //
  // const payload = z
  //   .object({
  //     client_id: z.string({
  //       invalid_type_error: 'Client ID is invalid',
  //       required_error: 'Client ID is missing',
  //     }),
  //     scope: z
  //       .string()
  //       .optional()
  //       .refine(
  //         (value) =>
  //           typeof value === 'undefined' ||
  //           value
  //             ?.split(' ')
  //             .every((scope) => scopeValidationRegex.test(scope)),
  //         { message: 'One or more scopes are invalid' },
  //       )
  //       .transform((scopes) => scopes?.split(' ')),
  //   })
  //   .safeParse(Object.fromEntries(body.entries()));
  //
  // if (!payload.success) {
  //   // TODO: There must be a better way to do this.
  //   const message =
  //     payload.error?.format().client_id?._errors.join(', ') ??
  //     'Invalid request';
  //
  //   return oauthError('invalid_request', message);
  // }
  //
  // const { client_id: clientId, scope: scopes } = payload.data;
  // let client;
  //
  // try {
  //   client = await loadClient(database, clientId);
  // } catch {
  //   return oauthError('invalid_client', 'The client ID is invalid');
  // }
  //
  // if (scopes && !scopes.every((scope) => client.scopes.includes(scope))) {
  //   return oauthError('invalid_scope', 'One or more scopes are invalid');
  // }
  //
  // let deviceChallenge;
  //
  // try {
  //   deviceChallenge = await createDeviceChallenge(database, clientId, scopes);
  // } catch {
  //   return oauthError(
  //     'server_error',
  //     'Device Challenges are currently not available. ' +
  //       'Please retry later or use another way to authorize the device, if possible',
  //   );
  // }
  //
  // const userCode = formatUserCode(deviceChallenge.user_code);
  // const verificationUri = new URL('/device', url);
  // const verificationUriComplete = new URL(verificationUri);
  // verificationUriComplete.searchParams.set('user_code', userCode);
  //
  // return json({
  //   verification_uri: verificationUri,
  //   verification_uri_complete: verificationUriComplete,
  //   device_code: deviceChallenge.device_code,
  //   user_code: userCode,
  //   interval: Number(OAUTH_DEVICE_POLLING_INTERVAL ?? 5),
  //   expires_in: offsetInSeconds(deviceChallenge.expires_at),
  // });
} satisfies RequestHandler;
