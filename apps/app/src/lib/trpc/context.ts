import { resolveUserId } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';

export async function createContext({
  cookies,
  platform,
  url,
  locals: { database },
}: RequestEvent) {
  const userId = resolveUserId(cookies) || '';

  return { userId, url, platform, database };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
