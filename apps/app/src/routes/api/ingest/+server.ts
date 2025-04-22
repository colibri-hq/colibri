import { oauth } from '$lib/server/oauth';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST = async function handle({ request, locals: { database } }) {
  const server = oauth(database);
  const token = await server.checkAuthorization(request);

  return json({ token });
} satisfies RequestHandler;
