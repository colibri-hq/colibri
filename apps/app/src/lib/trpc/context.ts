import type { RequestEvent } from "@sveltejs/kit";
import { resolveUserId } from "$lib/server/auth";

export async function createContext({
  cookies,
  platform,
  url,
  locals: { database, storage },
}: RequestEvent) {
  const userId = resolveUserId(cookies) || "";

  return { userId, url, platform, database, storage };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
