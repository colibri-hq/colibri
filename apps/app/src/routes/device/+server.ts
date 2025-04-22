import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const fallback = function handle() {
  throw redirect(303, '/auth/oauth/device');
} satisfies RequestHandler;

export const prerender = true;
