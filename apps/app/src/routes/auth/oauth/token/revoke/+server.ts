import { oauth } from '$lib/server/oauth';
import { OAuthError } from '@colibri-hq/oauth';
import type { RequestHandler } from './$types';

export const prerender = false;

export const POST: RequestHandler = async function handler({
  request,
  locals: { database },
}) {
  try {
    return oauth(database).handleTokenRevocation(request);
  } catch (cause) {
    if (cause instanceof OAuthError) {
      const { response } = cause;

      return response;
    }

    throw new Error('Failed to handle token introspection request', { cause });
  }
};
