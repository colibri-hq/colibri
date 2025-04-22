import { oauth } from '$lib/server/oauth';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET = async function handle(request, { locals: { database } }) {
  return oauth(database).handleServerMetadataRequest(request);
} satisfies RequestHandler;
