import { oauth } from '$lib/server/oauth';
import { OAuthError } from '@colibri-hq/oauth';
import { type RequestHandler } from '@sveltejs/kit';

export const POST = async function handle({ request, locals: { database } }) {
  try {
    return oauth(database).handlePushedAuthorizationRequest(request);
  } catch (cause) {
    if (cause instanceof OAuthError) {
      const { response } = cause;

      return response;
    }

    throw new Error('Failed to handle pushed authorization request', { cause });
  }
} satisfies RequestHandler;
