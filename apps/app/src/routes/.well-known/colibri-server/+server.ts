import { json } from '@sveltejs/kit';
import { version } from '../../../../package.json' with { type: 'json' };
import type { RequestHandler } from './$types';

export const GET = function handle({ url }) {
  return json({
    instance_url: url.origin,
    version,
  });
} satisfies RequestHandler;
